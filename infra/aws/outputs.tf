output "app_url" {
  description = "Public URL of the app."
  value       = local.app_url
}

output "github_variables" {
  description = "Set these as repository variables (Settings > Secrets and variables > Actions > Variables)."
  value = {
    AWS_REGION             = var.aws_region
    AWS_DEPLOY_ROLE_ARN    = aws_iam_role.github_deploy.arn
    MIGRATE_SUBNETS        = join(",", aws_subnet.public[*].id)
    MIGRATE_SECURITY_GROUP = aws_security_group.backend.id
  }
}

output "seed_command" {
  description = "Optional: load demo data once the first deploy has finished."
  value       = "aws ecs run-task --region ${var.aws_region} --cluster ${aws_ecs_cluster.main.name} --task-definition ${aws_ecs_task_definition.backend.family} --launch-type FARGATE --network-configuration 'awsvpcConfiguration={subnets=[${join(",", aws_subnet.public[*].id)}],securityGroups=[${aws_security_group.backend.id}],assignPublicIp=ENABLED}' --overrides '{\"containerOverrides\":[{\"name\":\"backend\",\"command\":[\"node\",\"dist/seed.js\"]}]}'"
}
