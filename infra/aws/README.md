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

Roughly **USD 50–60/month** in `ap-southeast-1`: ALB ~$20, two 0.25 vCPU Fargate tasks ~$18, RDS `db.t4g.micro` + 20 GB ~$17, public IPv4 addresses ~$15, plus small amounts for logs and ECR. Check the Billing console. Running the Terraform workflow with `destroy` removes everything and stops the charges.

## First-time setup

Terraform runs in GitHub Actions (`.github/workflows/terraform.yml`) using an IAM role you create once by hand:

- **OIDC provider:** `token.actions.githubusercontent.com` with audience `sts.amazonaws.com`.
- **Role** (e.g. `terraform-deployer`): trusts that provider for `repo:manimaran98/order-flow:*`. It needs rights to manage VPC, ELB, ECS, RDS, ECR, IAM, SSM, CloudWatch Logs, Cloud Map and the S3 state bucket. On a personal demo account, `AdministratorAccess` is the practical choice.

Then:

1. In GitHub, open **Settings → Secrets and variables → Actions → Variables** and add:
   - `AWS_TERRAFORM_ROLE_ARN` = the role's ARN
   - `AWS_REGION` = `ap-southeast-1`
2. Merge a change under `infra/aws/` to `main`, or open **Actions → Terraform → Run workflow** with `apply`. The first run creates the S3 state bucket `orderflow-tfstate-<account id>`, then the stack (~10–15 minutes, mostly RDS).
3. The run summary shows the app URL and the variables for the Deploy workflow (`AWS_DEPLOY_ROLE_ARN`, `MIGRATE_SUBNETS`, `MIGRATE_SECURITY_GROUP`). Add those as repository variables too.
4. Open **Actions → Deploy → Run workflow** on `main`. It pushes the images, runs migrations and starts both services. Until this first deploy, the ECS services can't pull an image and keep retrying.
5. Open the app URL and register the first account (it becomes ADMIN), or load demo data with the seed command shown in the same Terraform run summary.

From then on:
- Pull requests that touch `infra/aws/` get a plan in the run summary.
- Merging them applies.
- Every push to `main` that passes CI deploys the app.

Deployment uses its own narrower role, `orderflow-github-deploy`, which Terraform creates. It can push images and update the services, nothing else.

**Running Terraform locally** (optional) needs the same backend settings:

```bash
terraform init -backend-config="bucket=orderflow-tfstate-<account id>"   -backend-config="key=orderflow/terraform.tfstate" -backend-config="region=ap-southeast-1"
```

## Day-to-day

| Task | How |
|---|---|
| Logs | CloudWatch log groups `/ecs/orderflow-backend`, `-frontend`, `-migrate` |
| Roll back | Re-run the Deploy workflow for an earlier commit, or point the service at a previous task definition revision |
| Rotate DB password + JWT secret | Increase `secrets_version`, `terraform apply`, then re-run Deploy so tasks pick up the new values. Rotating the JWT secret logs everyone out. |
| Tear down (stop all charges) | **Actions → Terraform → Run workflow → destroy**. The state bucket is kept, and `apply` brings everything back. |

## Adding HTTPS later

Get a domain, then add an ACM certificate and a 443 listener in `alb.tf`, redirect port 80 to 443, and remove `COOKIE_SECURE=false` from the frontend task in `ecs.tf`. Until then the session cookie is sent over plain HTTP, which is fine for a demo but not for real customer data.
