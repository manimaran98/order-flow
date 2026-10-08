# AWS deployment (ECS Fargate + RDS)

```
            internet
               │ :80 (+ :443 once HTTPS is on)
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
- **Role** (e.g. `terraform-deployer`): trusts that provider for `repo:manimaran98/order-flow:*`. It needs rights to manage VPC, ELB, ECS, RDS, ECR, IAM, SSM, CloudWatch Logs, Cloud Map and the S3 state bucket (plus ACM and Route 53 for [HTTPS](#adding-https)). On a personal demo account, `AdministratorAccess` is the practical choice.

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

`terraform test` needs no AWS access (`terraform init -backend=false` is enough): `tests/https.tftest.hcl` runs the HTTPS on/off combinations against a mocked AWS provider. The workflow runs it too.

## Day-to-day

| Task | How |
|---|---|
| Logs | CloudWatch log groups `/ecs/orderflow-backend`, `-frontend`, `-migrate` |
| Roll back | Re-run the Deploy workflow for an earlier commit, or point the service at a previous task definition revision |
| Rotate DB password + JWT secret | Increase `secrets_version`, `terraform apply`, then re-run Deploy so tasks pick up the new values. Rotating the JWT secret logs everyone out. |
| Tear down (stop all charges) | **Actions → Terraform → Run workflow → destroy**. The state bucket is kept, and `apply` brings everything back. |

## Adding HTTPS

Without a domain the app is served over plain HTTP on the ALB's own hostname, and the session cookie travels unencrypted. That's fine for a demo, not for real customer data. HTTPS is switched on with repository variables, no code changes, in two applies so neither one sits waiting for DNS:

| Variable | Value |
|---|---|
| `DOMAIN_NAME` | The hostname to serve on, e.g. `app.example.com` (lowercase, no `https://`) |
| `ROUTE53_ZONE_ID` | Only if the domain's DNS is hosted in Route 53: the hosted zone ID, e.g. `Z0123456789ABCDEFGHIJ` |
| `HTTPS_ENABLED` | `true`, but only once the certificate is issued (step 4) |

Set them under **Settings → Secrets and variables → Actions → Variables**. Changing a variable doesn't start a run, so each "apply" below means **Actions → Terraform → Run workflow → apply** on `main`.

**Cost:** ACM public certificates are free. A Route 53 hosted zone costs $0.50/month plus a few cents per million queries; DNS at your registrar is usually free. The domain itself is paid to the registrar.

### Path A: DNS hosted in Route 53

Use this if you bought the domain through Route 53 (the hosted zone is created for you), or created a hosted zone and pointed the registrar's name servers at it.

1. Find the zone ID: **Route 53 → Hosted zones**, or `aws route53 list-hosted-zones-by-name --dns-name example.com`.
2. Set `DOMAIN_NAME` and `ROUTE53_ZONE_ID`, then apply. Terraform requests the certificate and writes both the validation CNAME and an alias `A` record from the domain to the ALB. `http://<domain>` works from here on.
3. Wait for the certificate to show **ISSUED**, usually a few minutes. Check either way:
   - The apply's run summary prints the exact command. It looks like `aws acm describe-certificate --region ap-southeast-1 --certificate-arn <arn> --query Certificate.Status --output text` (works in AWS CloudShell).
   - **AWS Console → Certificate Manager**, in the stack's region (`ap-southeast-1`), not `us-east-1`. Status column: *Issued*.
4. Set `HTTPS_ENABLED` = `true`, then apply.
5. Re-run **Actions → Deploy** so the tasks start with the new settings (next section).

### Path B: DNS at another registrar

1. Set `DOMAIN_NAME` (leave `ROUTE53_ZONE_ID` unset), then apply.
2. The run summary lists the records under **DNS for \<domain\>**. Add both at your registrar's DNS settings:
   - the certificate's validation `CNAME` (name `_<random>.<domain>`, value `_<random>.acm-validations.aws.`). Some registrars append the domain to the name automatically; if so, enter only the part before your domain. Leave this record in place permanently: ACM uses it to renew the certificate each year.
   - a `CNAME` from your domain to the ALB hostname (`<project>-<id>.ap-southeast-1.elb.amazonaws.com`). An apex domain (`example.com`, no subdomain) can't be a CNAME at most registrars: use the registrar's `ALIAS`/`ANAME`/CNAME-flattening type if it has one, or serve the app on a subdomain such as `app.example.com`. Don't point an `A` record at the ALB's IPs; they change.

   The same values are available any time from `terraform output dns_records`.
3. Wait for **ISSUED**, as in Path A step 3. It can take from a few minutes to a few hours depending on the registrar's DNS. To see whether the record is visible yet: `nslookup -type=CNAME _<random>.<domain>`. A certificate still *Pending validation* after 72 hours fails; fix the record, then remove `DOMAIN_NAME`, apply, set it again and apply to request a fresh one.
4. Set `HTTPS_ENABLED` = `true`, then apply.
5. Re-run **Actions → Deploy** (next section).

### What the second apply changes

- Adds a 443 listener with the certificate (`ELBSecurityPolicy-TLS13-1-2-2021-06`: TLS 1.3 and 1.2 only) and opens 443 on the ALB's security group.
- Port 80 now answers with a 301 redirect to `https://<domain>`, so old links and typed URLs still land on HTTPS.
- Registers new task definitions with `COOKIE_SECURE=true` (frontend) and `CORS_ORIGIN=https://<domain>` (backend), and the `app_url` output becomes `https://<domain>`. The services keep running their current revision until the next deploy, which is why step 5 re-runs **Deploy**; the site already works over HTTPS in between.

If the apply fails with a timeout on `aws_acm_certificate_validation`, the certificate wasn't issued yet: set `HTTPS_ENABLED` back to `false` (or wait), check the DNS record, and apply again once it shows ISSUED.

To go back to plain HTTP, set `HTTPS_ENABLED` = `false` and apply (the certificate is kept), then re-run **Deploy**. Removing `DOMAIN_NAME` as well deletes the certificate and, with Route 53, its records.

The `terraform-deployer` role needs ACM rights, plus Route 53 rights for Path A. `AdministratorAccess` already covers both.
