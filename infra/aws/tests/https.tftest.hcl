# Offline checks of the HTTPS switch: a mocked AWS provider, no credentials needed.
#   terraform init -backend=false && terraform test

# Test-file values outrank the TF_VAR_* the workflow sets from repository variables.
variables {
  domain_name     = ""
  https_enabled   = false
  route53_zone_id = ""
}

mock_provider "aws" {
  mock_data "aws_availability_zones" {
    defaults = { names = ["ap-southeast-1a", "ap-southeast-1b"] }
  }

  mock_data "aws_iam_policy_document" {
    defaults = { json = "{}" }
  }

  mock_resource "aws_lb" {
    defaults = {
      arn      = "arn:aws:elasticloadbalancing:ap-southeast-1:111122223333:loadbalancer/app/orderflow/0123456789abcdef"
      dns_name = "orderflow-123.ap-southeast-1.elb.amazonaws.com"
      zone_id  = "Z1LMS91P8CMLE5"
    }
  }

  # The provider still validates ARN-typed arguments, so referenced ARNs need a real shape.
  mock_resource "aws_lb_target_group" {
    defaults = { arn = "arn:aws:elasticloadbalancing:ap-southeast-1:111122223333:targetgroup/orderflow-frontend/0123456789abcdef" }
  }

  mock_resource "aws_iam_role" {
    defaults = { arn = "arn:aws:iam::111122223333:role/mock" }
  }

  mock_resource "aws_service_discovery_service" {
    defaults = { arn = "arn:aws:servicediscovery:ap-southeast-1:111122223333:service/srv-mock" }
  }

  mock_resource "aws_acm_certificate" {
    defaults = {
      arn = "arn:aws:acm:ap-southeast-1:111122223333:certificate/mock"
      domain_validation_options = [{
        domain_name           = "app.example.com"
        resource_record_name  = "_abc.app.example.com."
        resource_record_type  = "CNAME"
        resource_record_value = "_xyz.acm-validations.aws."
      }]
    }
  }

  mock_resource "aws_acm_certificate_validation" {
    defaults = { certificate_arn = "arn:aws:acm:ap-southeast-1:111122223333:certificate/mock" }
  }
}

# random stays real: it runs offline, and mocks can't stand in for ephemeral resources.

run "no_domain_is_plain_http" {
  command = apply

  assert {
    condition = (
      length(aws_acm_certificate.app) == 0 &&
      length(aws_route53_record.cert_validation) == 0 &&
      length(aws_route53_record.app) == 0 &&
      length(aws_acm_certificate_validation.app) == 0 &&
      length(aws_lb_listener.https) == 0 &&
      length(aws_vpc_security_group_ingress_rule.alb_https) == 0
    )
    error_message = "No HTTPS resources without a domain."
  }

  assert {
    condition     = aws_lb_listener.http.default_action[0].type == "forward" && length(aws_lb_listener.http.default_action[0].redirect) == 0
    error_message = "Port 80 forwards to the app."
  }

  assert {
    condition     = output.app_url == "http://orderflow-123.ap-southeast-1.elb.amazonaws.com" && length(output.dns_records) == 0 && output.certificate_status_command == ""
    error_message = "Outputs match the HTTP-only stack."
  }

  assert {
    condition     = strcontains(aws_ecs_task_definition.frontend.container_definitions, "{\"name\":\"COOKIE_SECURE\",\"value\":\"false\"}")
    error_message = "COOKIE_SECURE stays false."
  }

  assert {
    condition     = aws_lb_target_group.frontend.health_check[0].path == "/login"
    error_message = "Health check stays on /login until /api/health is deployed."
  }
}

run "domain_registrar_phase_one" {
  command = apply
  variables {
    domain_name = "app.example.com"
  }

  assert {
    condition = (
      length(aws_acm_certificate.app) == 1 &&
      length(aws_route53_record.cert_validation) == 0 &&
      length(aws_route53_record.app) == 0 &&
      length(aws_acm_certificate_validation.app) == 0 &&
      length(aws_lb_listener.https) == 0 &&
      length(aws_vpc_security_group_ingress_rule.alb_https) == 0
    )
    error_message = "Phase one only requests the certificate."
  }

  assert {
    condition     = aws_lb_listener.http.default_action[0].type == "forward"
    error_message = "Port 80 still forwards before HTTPS is enabled."
  }

  assert {
    condition = jsonencode(output.dns_records) == jsonencode([
      { name = "_abc.app.example.com.", type = "CNAME", value = "_xyz.acm-validations.aws." },
      { name = "app.example.com", type = "CNAME", value = "orderflow-123.ap-southeast-1.elb.amazonaws.com" },
    ])
    error_message = "Registrar records are listed."
  }

  assert {
    condition     = startswith(output.app_url, "http://") && strcontains(aws_ecs_task_definition.frontend.container_definitions, "{\"name\":\"COOKIE_SECURE\",\"value\":\"false\"}")
    error_message = "App stays on HTTP until https_enabled."
  }
}

run "domain_route53_phase_one" {
  command = apply
  variables {
    domain_name     = "app.example.com"
    route53_zone_id = "Z0123456789ABC"
  }

  assert {
    condition = (
      length(aws_acm_certificate.app) == 1 &&
      length(aws_route53_record.cert_validation) == 1 &&
      length(aws_route53_record.app) == 1 &&
      length(aws_acm_certificate_validation.app) == 0 &&
      length(aws_lb_listener.https) == 0
    )
    error_message = "Route 53 gets the validation and alias records."
  }

  assert {
    condition     = length(output.dns_records) == 0
    error_message = "Nothing to add by hand with Route 53."
  }
}

run "https_registrar" {
  command = apply
  variables {
    domain_name   = "app.example.com"
    https_enabled = true
  }

  assert {
    condition = (
      length(aws_acm_certificate.app) == 1 &&
      length(aws_route53_record.cert_validation) == 0 &&
      length(aws_route53_record.app) == 0 &&
      length(aws_acm_certificate_validation.app) == 1 &&
      aws_acm_certificate_validation.app[0].validation_record_fqdns == null &&
      length(aws_lb_listener.https) == 1 &&
      length(aws_vpc_security_group_ingress_rule.alb_https) == 1
    )
    error_message = "HTTPS listener, validation and :443 rule exist."
  }

  assert {
    condition = (
      aws_lb_listener.http.default_action[0].type == "redirect" &&
      aws_lb_listener.http.default_action[0].redirect[0].protocol == "HTTPS" &&
      aws_lb_listener.http.default_action[0].redirect[0].status_code == "HTTP_302" &&
      aws_lb_listener.http.default_action[0].redirect[0].host == "app.example.com"
    )
    error_message = "Port 80 redirects to HTTPS."
  }

  assert {
    condition     = aws_lb_listener.https[0].ssl_policy == "ELBSecurityPolicy-TLS13-1-2-2021-06"
    error_message = "Modern TLS policy."
  }

  assert {
    condition = (
      output.app_url == "https://app.example.com" &&
      strcontains(aws_ecs_task_definition.frontend.container_definitions, "{\"name\":\"COOKIE_SECURE\",\"value\":\"true\"}") &&
      strcontains(aws_ecs_task_definition.backend.container_definitions, "{\"name\":\"CORS_ORIGIN\",\"value\":\"https://app.example.com\"}")
    )
    error_message = "App URL, secure cookie and CORS origin switch to HTTPS."
  }
}

run "https_route53" {
  command = apply
  variables {
    domain_name     = "app.example.com"
    route53_zone_id = "Z0123456789ABC"
    https_enabled   = true
  }

  assert {
    condition = (
      length(aws_route53_record.cert_validation) == 1 &&
      length(aws_route53_record.app) == 1 &&
      length(aws_acm_certificate_validation.app) == 1 &&
      length(aws_acm_certificate_validation.app[0].validation_record_fqdns) == 1 &&
      length(aws_lb_listener.https) == 1
    )
    error_message = "Route 53 validation feeds the certificate validation."
  }
}

# Runs share state, so this exercises switching HTTPS off again on a live stack.
run "https_switched_off_again" {
  command = apply
  variables {
    domain_name     = "app.example.com"
    route53_zone_id = "Z0123456789ABC"
  }

  assert {
    condition = (
      length(aws_acm_certificate.app) == 1 &&
      length(aws_acm_certificate_validation.app) == 0 &&
      length(aws_lb_listener.https) == 0 &&
      length(aws_vpc_security_group_ingress_rule.alb_https) == 0 &&
      aws_lb_listener.http.default_action[0].type == "forward" &&
      output.app_url == "http://orderflow-123.ap-southeast-1.elb.amazonaws.com"
    )
    error_message = "Turning https_enabled off restores plain HTTP and keeps the certificate."
  }
}

run "https_without_domain_is_rejected" {
  command = plan
  variables {
    https_enabled = true
  }
  expect_failures = [var.https_enabled]
}

run "zone_without_domain_is_rejected" {
  command = plan
  variables {
    route53_zone_id = "Z0123456789ABC"
  }
  expect_failures = [var.route53_zone_id]
}

run "bad_domain_is_rejected" {
  command = plan
  variables {
    domain_name = "https://app.example.com"
  }
  expect_failures = [var.domain_name]
}
