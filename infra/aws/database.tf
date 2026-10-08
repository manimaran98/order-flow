# The password is generated as an ephemeral value and written through write-only
# arguments, so it never lands in Terraform state. The DB and the SSM parameters
# in secrets.tf receive it in the same apply; bump var.secrets_version to rotate.
ephemeral "random_password" "db" {
  length  = 32
  special = false # goes into a connection URL
}

resource "aws_db_subnet_group" "main" {
  name       = var.project
  subnet_ids = aws_subnet.private[*].id
}

resource "aws_db_instance" "main" {
  identifier     = "${var.project}-db"
  engine         = "postgres"
  engine_version = "16"
  instance_class = var.db_instance_class

  allocated_storage = 20
  storage_type      = "gp3"
  storage_encrypted = true

  db_name             = "orderflow"
  username            = "orderflow"
  password_wo         = ephemeral.random_password.db.result
  password_wo_version = var.secrets_version

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false
  multi_az               = false

  backup_retention_period    = 1
  auto_minor_version_upgrade = true
  apply_immediately          = true

  # Demo environment: `terraform destroy` removes it without a final snapshot.
  deletion_protection = false
  skip_final_snapshot = true
}
