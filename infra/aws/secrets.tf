# Runtime secrets as SSM SecureStrings (free, unlike Secrets Manager). ECS injects
# them into containers at start. The values are write-only, so not kept in state.

ephemeral "random_password" "jwt" {
  length  = 64
  special = false
}

locals {
  ssm_prefix = "/${var.project}"
  db_target  = "${aws_db_instance.main.address}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
}

# RDS for Postgres 16 enforces TLS. The API uses node-postgres, where
# uselibpqcompat makes sslmode=require mean "encrypt" as in libpq, rather than
# full certificate verification against a CA bundle the image does not ship.
resource "aws_ssm_parameter" "database_url" {
  name             = "${local.ssm_prefix}/DATABASE_URL"
  type             = "SecureString"
  value_wo         = "postgresql://orderflow:${ephemeral.random_password.db.result}@${local.db_target}?uselibpqcompat=true&sslmode=require"
  value_wo_version = var.secrets_version
}

# Prisma's schema engine (migrations) parses the URL itself and doesn't know uselibpqcompat.
resource "aws_ssm_parameter" "migrate_database_url" {
  name             = "${local.ssm_prefix}/MIGRATE_DATABASE_URL"
  type             = "SecureString"
  value_wo         = "postgresql://orderflow:${ephemeral.random_password.db.result}@${local.db_target}?sslmode=require"
  value_wo_version = var.secrets_version
}

resource "aws_ssm_parameter" "jwt_secret" {
  name             = "${local.ssm_prefix}/JWT_SECRET"
  type             = "SecureString"
  value_wo         = ephemeral.random_password.jwt.result
  value_wo_version = var.secrets_version
}
