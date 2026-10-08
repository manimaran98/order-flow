output "app_url" {
  description = "Public URL of the app."
  value       = local.app_url
}

output "alb_dns_name" {
  description = "The load balancer's own hostname, for pointing domain_name at it."
  value       = aws_lb.main.dns_name
}

# Empty when there is no domain, or when Route 53 holds the records. Otherwise:
# the certificate's validation CNAME, plus the record that sends the domain to the
# ALB. An apex domain (example.com) can't be a CNAME at most registrars; use the
# registrar's ALIAS/ANAME type there, or serve the app on a subdomain.
output "dns_records" {
  description = "DNS records to add at your registrar for domain_name."
  value = local.has_domain && !local.use_route53 ? concat(local.cert_validation_records, [{
    name  = var.domain_name
    type  = "CNAME"
    value = aws_lb.main.dns_name
  }]) : []
}

output "certificate_status_command" {
  description = "Prints the certificate's status. Set HTTPS_ENABLED=true once it says ISSUED."
  value       = local.has_domain ? "aws acm describe-certificate --region ${var.aws_region} --certificate-arn ${aws_acm_certificate.app[0].arn} --query Certificate.Status --output text" : ""
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
