locals {
  images = toset(["backend", "backend-migrate", "frontend"])
}

resource "aws_ecr_repository" "app" {
  for_each = local.images

  name                 = "${var.project}-${each.key}"
  image_tag_mutability = "MUTABLE" # deploys push :<sha> and move :latest
  force_delete         = true      # let `terraform destroy` remove repos that still hold images

  image_scanning_configuration {
    scan_on_push = true
  }
}

resource "aws_ecr_lifecycle_policy" "app" {
  for_each   = aws_ecr_repository.app
  repository = each.value.name

  policy = jsonencode({
    rules = [{
      rulePriority = 1
      description  = "Keep the 10 most recent images"
      selection = {
        tagStatus   = "any"
        countType   = "imageCountMoreThan"
        countNumber = 10
      }
      action = { type = "expire" }
    }]
  })
}
