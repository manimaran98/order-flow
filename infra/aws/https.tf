# HTTPS for var.domain_name, in two applies so that no apply blocks on DNS:
#   1. domain_name set: request the certificate. With a Route 53 zone Terraform
#      writes its validation record and the alias; otherwise the dns_records
#      output lists what to add at the registrar.
#   2. https_enabled: once the certificate is ISSUED, add the 443 listener and
#      make port 80 redirect to it.
# With neither set, nothing here exists and the ALB serves HTTP as before.

locals {
  has_domain  = var.domain_name != ""
  use_route53 = local.has_domain && var.route53_zone_id != ""

  # Empty unless a domain is set. Values are only known after the first apply.
  cert_validation_records = [
    for o in flatten(aws_acm_certificate.app[*].domain_validation_options) : {
      name  = o.resource_record_name
      type  = o.resource_record_type
      value = o.resource_record_value
    }
  ]
}

# Public ACM certificates are free. It lives in the stack's region because an ALB
# can only use certificates from its own region.
resource "aws_acm_certificate" "app" {
  count             = local.has_domain ? 1 : 0
  domain_name       = var.domain_name
  validation_method = "DNS"

  # The listener has to move to a replacement before the old one can be deleted.
  lifecycle {
    create_before_destroy = true
  }
}

# Keyed by domain name, which ACM knows at plan time, so for_each works on the
# first apply even though the record values don't exist yet.
resource "aws_route53_record" "cert_validation" {
  for_each = local.use_route53 ? {
    for o in flatten(aws_acm_certificate.app[*].domain_validation_options) : o.domain_name => o
  } : {}

  zone_id         = var.route53_zone_id
  name            = each.value.resource_record_name
  type            = each.value.resource_record_type
  records         = [each.value.resource_record_value]
  ttl             = 300
  allow_overwrite = true # ACM reuses one record per name and account, so a replacement certificate shares it
}

resource "aws_route53_record" "app" {
  count   = local.use_route53 ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.domain_name
  type    = "A"

  alias {
    name                   = aws_lb.main.dns_name
    zone_id                = aws_lb.main.zone_id
    evaluate_target_health = true
  }
}

# Waits for ISSUED. HTTPS is only switched on after the certificate is issued,
# so this normally returns at once; the short timeout turns a premature switch
# into a clear failure instead of a long hang.
resource "aws_acm_certificate_validation" "app" {
  count                   = var.https_enabled ? 1 : 0
  certificate_arn         = aws_acm_certificate.app[0].arn
  validation_record_fqdns = local.use_route53 ? [for r in aws_route53_record.cert_validation : r.fqdn] : null

  timeouts {
    create = "10m"
  }
}

resource "aws_lb_listener" "https" {
  count             = var.https_enabled ? 1 : 0
  load_balancer_arn = aws_lb.main.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06" # TLS 1.3 + 1.2 with forward secrecy only
  certificate_arn   = aws_acm_certificate_validation.app[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}
