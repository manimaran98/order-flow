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

variable "github_oidc_subject_prefix" {
  description = <<-EOT
    The repo part of the OIDC `sub` claim when the repository uses GitHub's immutable subject
    format: repo:<owner>@<owner id>/<repo>@<repo id>. Check with
    `curl https://api.github.com/repos/<owner>/<repo>/actions/oidc/customization/sub`
    (sub_claim_prefix). Empty if the repository uses the classic repo:<owner>/<repo> format.
  EOT
  type        = string
  default     = "repo:manimaran98@108385697/order-flow@1394933874"
}

variable "create_github_oidc_provider" {
  description = "The account already has the token.actions.githubusercontent.com OIDC provider (the terraform-deployer role uses it). Set true only in an account without one."
  type        = bool
  default     = false
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

# HTTPS takes two applies so that neither waits on DNS: the first (domain_name
# set) requests the certificate, the second (https_enabled) uses it once ISSUED.
# The Terraform workflow passes unset repository variables as "", so "" is "not set".

variable "domain_name" {
  description = "Hostname to serve the app on, e.g. app.example.com. Empty: no certificate; the app is served over HTTP on the ALB's own DNS name."
  type        = string
  default     = ""
  nullable    = false

  validation {
    condition     = var.domain_name == "" || can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.domain_name))
    error_message = "domain_name must be a lowercase hostname such as app.example.com, without scheme, port or path."
  }
}

variable "https_enabled" {
  description = "Serve HTTPS with the domain_name certificate and redirect HTTP to it. Turn on only once the certificate is ISSUED."
  type        = bool
  default     = false
  nullable    = false

  validation {
    condition     = !var.https_enabled || var.domain_name != ""
    error_message = "https_enabled needs domain_name: set DOMAIN_NAME, apply, add the DNS records, wait for ISSUED, then set HTTPS_ENABLED."
  }
}

variable "route53_zone_id" {
  description = "Route 53 hosted zone that holds domain_name. Set: Terraform writes the validation and alias records. Empty: the dns_records output lists them for your registrar."
  type        = string
  default     = ""
  nullable    = false

  validation {
    condition     = var.route53_zone_id == "" || var.domain_name != ""
    error_message = "route53_zone_id only has an effect together with domain_name."
  }
}
