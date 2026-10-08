# AWS deployment (ECS Fargate + RDS)

```
            internet
               │ :80
        ┌──────▼──────┐
        │     ALB     │  public subnets (2 AZs)
        └──────┬──────┘
               │ :3000            SG: from ALB only
        ┌──────▼──────┐
        │  frontend   │  Fargate, Next.js standalone
        └──────┬──────┘
               │ :4000  backend.orderflow.local (Cloud Map)
        ┌──────▼──────┐
        │   backend   │  Fargate, NestJS          SG: from frontend only
        └──────┬──────┘
               │ :5432 TLS
        ┌──────▼──────┐
        │ RDS Postgres│  private subnets, no internet route
        └─────────────┘
```

- **Images** live in ECR. GitHub Actions builds them and deploys through an OIDC role, so no AWS keys are stored in GitHub.
- **Secrets** (DB URL, JWT secret) are SSM SecureStrings injected by ECS at container start. They're generated as Terraform ephemeral values and written with write-only arguments, so they never appear in Terraform state.
- **Migrations** run as a one-off Fargate task (the `backend-migrate` image) before the services are updated. If they fail, the deploy stops and the running version keeps serving.
- **Rollback**: the ECS deployment circuit breaker rolls a service back if new tasks don't become healthy.
- **No NAT gateway**: tasks sit in public subnets with public IPs so they can reach ECR, SSM and CloudWatch. Their security groups allow no inbound traffic from the internet. A NAT gateway would roughly double the bill.
- **The API isn't public.** The browser only talks to Next.js, which calls the API server-side over private DNS.

## Cost

Roughly **USD 50–60/month** in `ap-southeast-1`: ALB ~$20, two 0.25 vCPU Fargate tasks ~$18, RDS `db.t4g.micro` + 20 GB ~$17, public IPv4 addresses ~$15, plus small amounts for logs and ECR. Check the Billing console. `terraform destroy` removes everything and stops the charges.

## First-time setup

Prerequisites: [Terraform](https://developer.hashicorp.com/terraform/install) ≥ 1.11 (`winget install Hashicorp.Terraform`), the AWS CLI, and credentials for an IAM user or SSO role with admin rights. Avoid the root user.

```bash
aws configure            # or: aws configure sso
aws sts get-caller-identity

cd infra/aws
terraform init
terraform apply          # ~10 minutes, most of it RDS
terraform output github_variables
```

1. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add each key/value from `github_variables` as a repository variable.
2. Open **Actions → Deploy → Run workflow** on `main`. It pushes the images, runs migrations and starts both services. Until this first deploy, the ECS services can't pull an image and keep retrying.
3. Open `terraform output app_url` and register the first account (it becomes ADMIN), or load demo data with the command from `terraform output seed_command`.

From then on, every push to `main` that passes CI deploys automatically.

## Day-to-day

| Task | How |
|---|---|
| Logs | CloudWatch log groups `/ecs/orderflow-backend`, `-frontend`, `-migrate` |
| Roll back | Re-run the Deploy workflow for an earlier commit, or point the service at a previous task definition revision |
| Rotate DB password + JWT secret | Increase `secrets_version`, `terraform apply`, then re-run Deploy so tasks pick up the new values. Rotating the JWT secret logs everyone out. |
| Tear down | `terraform destroy` |

## Adding HTTPS later

Get a domain, then add an ACM certificate and a 443 listener in `alb.tf`, redirect port 80 to 443, and remove `COOKIE_SECURE=false` from the frontend task in `ecs.tf`. Until then the session cookie is sent over plain HTTP, which is fine for a demo but not for real customer data.
