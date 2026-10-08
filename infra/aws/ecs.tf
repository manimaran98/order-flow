# Terraform creates the cluster, services and first task definitions. After that
# the Deploy workflow owns the image: it registers new task definition revisions
# and points the services at them, so the services ignore task_definition drift.

locals {
  app_url = "http://${aws_lb.main.dns_name}"

  ecr_url = { for name, repo in aws_ecr_repository.app : name => repo.repository_url }

  log_config = { for name in ["backend", "frontend", "migrate"] : name => {
    logDriver = "awslogs"
    options = {
      awslogs-group         = aws_cloudwatch_log_group.app[name].name
      awslogs-region        = var.aws_region
      awslogs-stream-prefix = name
    }
  } }
}

resource "aws_ecs_cluster" "main" {
  name = var.project
}

resource "aws_cloudwatch_log_group" "app" {
  for_each          = toset(["backend", "frontend", "migrate"])
  name              = "/ecs/${var.project}-${each.key}"
  retention_in_days = var.log_retention_days
}

# Private DNS so the frontend reaches the API at backend.<project>.local:4000.
resource "aws_service_discovery_private_dns_namespace" "main" {
  name = "${var.project}.local"
  vpc  = aws_vpc.main.id
}

resource "aws_service_discovery_service" "backend" {
  name = "backend"

  dns_config {
    namespace_id   = aws_service_discovery_private_dns_namespace.main.id
    routing_policy = "MULTIVALUE"

    dns_records {
      type = "A"
      ttl  = 10
    }
  }
}

# --- IAM: the execution role pulls images, reads the SSM secrets and writes logs.

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${var.project}-ecs-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "read_secrets" {
  statement {
    actions = ["ssm:GetParameters"]
    resources = [
      aws_ssm_parameter.database_url.arn,
      aws_ssm_parameter.migrate_database_url.arn,
      aws_ssm_parameter.jwt_secret.arn,
    ]
  }
}

resource "aws_iam_role_policy" "execution_secrets" {
  name   = "read-secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.read_secrets.json
}

# --- Task definitions

resource "aws_ecs_task_definition" "backend" {
  family                   = "${var.project}-backend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.backend_cpu
  memory                   = var.backend_memory
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name         = "backend"
    image        = "${local.ecr_url["backend"]}:latest"
    essential    = true
    portMappings = [{ containerPort = 4000, protocol = "tcp" }]
    environment = [
      { name = "PORT", value = "4000" },
      { name = "JWT_EXPIRES_IN", value = "8h" },
      { name = "CORS_ORIGIN", value = local.app_url },
    ]
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.database_url.arn },
      { name = "JWT_SECRET", valueFrom = aws_ssm_parameter.jwt_secret.arn },
    ]
    healthCheck = {
      command     = ["CMD-SHELL", "wget -qO- http://127.0.0.1:4000/health > /dev/null || exit 1"]
      interval    = 15
      timeout     = 5
      retries     = 3
      startPeriod = 30
    }
    logConfiguration = local.log_config["backend"]
  }])
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project}-frontend"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.frontend_cpu
  memory                   = var.frontend_memory
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name         = "frontend"
    image        = "${local.ecr_url["frontend"]}:latest"
    essential    = true
    portMappings = [{ containerPort = 3000, protocol = "tcp" }]
    environment = [
      { name = "PORT", value = "3000" },
      { name = "HOSTNAME", value = "0.0.0.0" },
      { name = "API_URL", value = "http://backend.${aws_service_discovery_private_dns_namespace.main.name}:4000" },
      # The ALB serves plain HTTP until a domain and certificate are added (see alb.tf).
      { name = "COOKIE_SECURE", value = "false" },
    ]
    logConfiguration = local.log_config["frontend"]
  }])
}

# One-off task, started by the Deploy workflow before the services are updated.
resource "aws_ecs_task_definition" "migrate" {
  family                   = "${var.project}-migrate"
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = 256
  memory                   = 512
  execution_role_arn       = aws_iam_role.execution.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = "X86_64"
  }

  container_definitions = jsonencode([{
    name      = "migrate"
    image     = "${local.ecr_url["backend-migrate"]}:latest"
    essential = true
    secrets = [
      { name = "DATABASE_URL", valueFrom = aws_ssm_parameter.migrate_database_url.arn },
    ]
    logConfiguration = local.log_config["migrate"]
  }])
}

# --- Services. Until the first deploy pushes images, their tasks fail to pull
# and ECS keeps retrying; run the Deploy workflow right after the first apply.

resource "aws_ecs_service" "backend" {
  name            = "${var.project}-backend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.backend.arn
  desired_count   = 1
  launch_type     = "FARGATE"

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.backend.id]
    assign_public_ip = true # pulls images without a NAT gateway; the SG blocks inbound
  }

  service_registries {
    registry_arn = aws_service_discovery_service.backend.arn
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }
}

resource "aws_ecs_service" "frontend" {
  name                              = "${var.project}-frontend"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = aws_ecs_task_definition.frontend.arn
  desired_count                     = 1
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60

  network_configuration {
    subnets          = aws_subnet.public[*].id
    security_groups  = [aws_security_group.frontend.id]
    assign_public_ip = true
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 3000
  }

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  lifecycle {
    ignore_changes = [task_definition]
  }

  depends_on = [aws_lb_listener.http]
}
