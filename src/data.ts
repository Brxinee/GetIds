import { SampleDataset } from './types';

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    name: "Production Server Logs",
    type: "Server Audit",
    icon: "Terminal",
    text: `2026-05-23T10:14:22.091Z [INFO] connection established for client ip 192.168.1.104
2026-05-23T10:14:23.112Z [DEBUG] session initialized: uuid 4a68ef32-8419-4cb5-88bf-97f1f2e96032 for account xbrainee@gmail.com
2026-05-23T10:14:23.411Z [SUCCESS] Stripe webhook payload matched. Transaction id: txn_3M3kL12Ea919Z7bA1048, amount: 29990, status: paid
2026-05-23T10:14:24.002Z [INFO] MongoDB record fetched: objectId 65ea8bf1a982cb12d9ff1002 from collection 'user_profiles'
2026-05-23T10:14:24.120Z [INFO] Job dispatched to active rabbitmq queue: q_id_912a9b_processing
2026-05-23T10:15:01.332Z [WARNING] Rate limit threshold approached for api key token usr_mock_67b8192aa6199f1092e022
2026-05-23T10:15:02.190Z [ERROR] Failed to coordinate replication on replica node pod_id_aws_987129`
  },
  {
    name: "DevOps Config Block",
    type: "Docker / Kubernetes",
    icon: "FileCode",
    text: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: container-routing-service
  namespace: prod-infra-routing
spec:
  replicas: 3
  template:
    metadata:
      labels:
        app: cluster-ingress-gateway
    spec:
      containers:
      - name: gateway-container
        image: custom-registry.io/gateway:v4.1.2
        env:
        - name: MONGO_URI
          value: "mongodb://admin_dev:pw_secret_991823a@cluster0.a28bc.mongodb.net/prod_core_db_2026?authSource=admin"
        - name: STRIPE_SECRET_KEY
          value: "sk_test_51No3K9LJ192aA81h902jH71V91o128c89b8aa7556a092ff91a"
        - name: SLACK_CHANNEL_ID
          value: "C071A982FBE"
        - name: SENDGRID_API_KEY
          value: "SG.f9e123_819a_77189b"
        - name: CLOUDFLARE_ZONE_ID
          value: "cf_zone_81a441092ff5e13a009bc29`
  },
  {
    name: "Customer Support Thread",
    type: "Chat Log",
    icon: "MessageSquare",
    text: `Agent [10:24:01 AM]: Hello! Thanks for reaching out to GetIds enterprise assistance. How can I resolve your issues today?
User [10:24:15 AM]: Hi! Our team is experiencing webhook callback failures. Here is our webhook config ID: wh_341b9a930211a7 and we need assistance.
user [10:24:32 AM]: Also, the developer who set this up registered under developer_account@getids.tech but she is out of office. Her Discord username is 'lucy_codes_99' (Id: dsc_391820938) if that helps.
Agent [10:25:02 AM]: I can locate that record instantly. I see a payload matching user account_id: usr_001923ab9102.
Agent [10:25:12 AM]: To authorize your organization, can you provide the workspace channel or the Stripe subscription code?
User [10:25:35 AM]: Yes! Here is the subscription ID: sub_1O8qY89bAb12 and our internal Telegram handle coordinate t.me/getids_admin_channel if that works.`
  },
  {
    name: "Database SQL Feed Dump",
    type: "Postgres Rows",
    icon: "Database",
    text: `INSERT INTO "public"."users" ("id", "display_name", "email", "created_at") VALUES
('usr_91ff841a-a001-449e-b81b-8c11aa298aef', 'Avery Mitchell', 'avery.mitchell@company.com', '2026-01-15 08:30:11'),
('usr_ce8812f2-1200-4bda-91aa-9f0ef9213be2', 'Devon Parker', 'devon.parker@dev.corp', '2026-02-18 14:15:32');

INSERT INTO "public"."channel_memberships" ("membership_id", "channel_id", "member_id") VALUES
('mem_81a93e81-cf12', 'chan_slack_general_2026', 'usr_91ff841a-a001-449e-b81b-8c11aa298aef'),
('mem_91b2289c-091f', 'chan_discord_audits', 'usr_ce8812f2-1200-4bda-91aa-9f0ef9213be2');`
  }
];
