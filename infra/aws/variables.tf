variable "aws_region" {
  description = "Region to deploy into. Singapore is the closest region to Malaysia that needs no opt-in."
  type        = string
  default     = "ap-southeast-1"
}

variable "project" {
  description = "Name prefix for every resource. The deploy workflow assumes \"orderflow\"."
  type        = string
  default     = "orderflow"
}

variable "github_repository" {
  description = "owner/repo allowed to deploy through GitHub Actions OIDC."
  type        = string
  default     = "manimaran98/order-flow"
}

variable "create_github_oidc_provider" {
  description = "Set false if the account already has the token.actions.githubusercontent.com OIDC provider."
  type        = bool
  default     = true
}

variable "db_instance_class" {
  type    = string
  default = "db.t4g.micro"
}

variable "secrets_version" {
  description = "Bump to generate a new DB password and JWT secret on the next apply (rotation), then redeploy."
  type        = number
  default     = 1
}

variable "backend_cpu" {
  type    = number
  default = 256
}

variable "backend_memory" {
  type    = number
  default = 512
}

variable "frontend_cpu" {
  type    = number
  default = 256
}

variable "frontend_memory" {
  type    = number
  default = 512
}

variable "log_retention_days" {
  type    = number
  default = 14
}
