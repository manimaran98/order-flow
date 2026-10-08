# Only the frontend is public. The browser never calls the API (Next.js calls it
# server-side), so the backend has no listener here.

resource "aws_lb" "main" {
  name                       = var.project
  load_balancer_type         = "application"
  subnets                    = aws_subnet.public[*].id
  security_groups            = [aws_security_group.alb.id]
  drop_invalid_header_fields = true
}

resource "aws_lb_target_group" "frontend" {
  name                 = "${var.project}-frontend"
  port                 = 3000
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = aws_vpc.main.id
  deregistration_delay = 30

  # A Route Handler that answers 200 without rendering a page, and stays 200
  # when the API is down, so an API outage doesn't get frontend tasks replaced.
  health_check {
    path                = "/api/health"
    matcher             = "200"
    interval            = 15
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }
}

# Plain HTTP forwards to the app until https_enabled; then it only redirects to
# the HTTPS listener in https.tf, so the session cookie never travels unencrypted.
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.main.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = var.https_enabled ? "redirect" : "forward"
    target_group_arn = var.https_enabled ? null : aws_lb_target_group.frontend.arn

    dynamic "redirect" {
      for_each = var.https_enabled ? [1] : []
      # To the domain, not #{host}: the old http://<alb-dns> links would otherwise land on a
      # certificate-name error. 302 because browsers cache 301s, which would strand returning
      # visitors on :443 if HTTPS is ever switched back off.
      content {
        host        = var.domain_name
        protocol    = "HTTPS"
        port        = "443"
        status_code = "HTTP_302"
      }
    }
  }

  # Turning HTTPS on creates the 443 listener before this one starts redirecting;
  # turning it off restores forwarding here before the 443 listener is removed.
  depends_on = [aws_lb_listener.https]
}
