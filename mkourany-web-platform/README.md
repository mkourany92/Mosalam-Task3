# Traefik Reverse Proxy Migration & Local Development Setup

## Project Overview

This project migrates a Docker Compose application from **NGINX** to **Traefik v3** as a reverse proxy while improving the overall architecture by introducing:

* HTTPS using **mkcert**
* Local development domains
* Service discovery through Traefik
* Automatic load balancing
* Monitoring stack integration
* Multi-network Docker architecture

---

# Architecture

```
                    Browser
                        │
                 HTTPS (443)
                        │
                 +---------------+
                 |    Traefik    |
                 +---------------+
                  │      │
        ┌─────────┼──────┼─────────────┐
        ▼         ▼      ▼             ▼
   app.local  api.local  grafana.local  prometheus.local
                                  │
                           cadvisor.local
```

Traefik is the only container exposed on ports **80** and **443**.

All requests are routed internally based on the **Host** header.

---

# Networks

Three Docker networks are used.

```
public-net
    │
    ├── Traefik
    ├── Frontend
    └── Backend

private-net
    │
    ├── Backend
    ├── MySQL
    └── Redis

monitoring-net
    │
    ├── Traefik
    ├── Grafana
    ├── Prometheus
    └── cAdvisor
```

---

# Local Domains

Instead of exposing applications through path prefixes:

```
https://traefik.local/grafana
https://traefik.local/prometheus
https://traefik.local/cadvisor
```

each service now has its own hostname:

```
https://app.local
https://api.local
https://traefik.local
https://grafana.local
https://prometheus.local
https://cadvisor.local
```

This eliminates redirect problems and better represents production deployments.

---

# /etc/hosts

```
127.0.0.1 localhost

127.0.0.1 app.local
127.0.0.1 api.local
127.0.0.1 traefik.local
127.0.0.1 grafana.local
127.0.0.1 prometheus.local
127.0.0.1 cadvisor.local
```

---

# HTTPS using mkcert

Install mkcert

```
sudo apt install mkcert
sudo apt install libnss3-tools
```

Install the local CA

```
mkcert -install
```

Generate certificates

```
mkcert \
localhost \
127.0.0.1 \
::1 \
app.local \
api.local \
traefik.local \
grafana.local \
prometheus.local \
cadvisor.local
```

Generated files

```
localhost+8.pem
localhost+8-key.pem
```

Rename them

```
localhost.crt
localhost.key
```

Place them inside

```
traefik/certs/
```

Traefik configuration

```yaml
tls:
  certificates:
    - certFile: /certs/localhost.crt
      keyFile: /certs/localhost.key
```

---

# Traefik Routing

Each service is routed only by its hostname.

Frontend

```yaml
Host(`app.local`)
```

Backend

```yaml
Host(`api.local`)
```

Grafana

```yaml
Host(`grafana.local`)
```

Prometheus

```yaml
Host(`prometheus.local`)
```

cAdvisor

```yaml
Host(`cadvisor.local`)
```

Traefik Dashboard

```yaml
Host(`traefik.local`) && PathPrefix(`/dashboard`)
```

---

# Why Host-based Routing?

Initially every service was exposed using PathPrefix.

Example

```
https://traefik.local/grafana
https://traefik.local/prometheus
https://traefik.local/cadvisor
```

This caused problems.

## cAdvisor

cAdvisor assumes it is running at `/`.

After

```
/cadvisor
```

was stripped, cAdvisor redirected to

```
/containers
```

instead of

```
/cadvisor/containers
```

Traefik therefore received

```
https://traefik.local/containers
```

which no router matched.

Result

```
404 page not found
```

Moving cAdvisor to

```
https://cadvisor.local
```

solved the issue completely.

---

# Backend API Conflict

Initially the dashboard router was configured as

```yaml
Host(`traefik.local`) &&
(PathPrefix(`/dashboard`) || PathPrefix(`/api`))
```

This conflicted with the backend API router.

Result

```
404
```

Removing

```
PathPrefix(`/api`)
```

from the dashboard router allowed the backend router to receive API requests.

---

# Traefik Docker API Issue

Encountered error

```
client version 1.24 is too old
minimum supported API version is 1.40
```

Although Docker Engine was

```
29.x
API 1.55
```

The issue was caused by an old Docker client inside the Traefik container.

After recreating the container with the correct Traefik image and configuration, the Docker provider connected successfully.

---

# ACME Permission Issue

Traefik reported

```
permissions 664 for acme.json are too open
```

Fixed by

```
chmod 600 acme.json
```

---

# Certificate Parsing Issue

Error

```
failed to find any PEM data
```

Cause

Wrong certificate file.

Solution

Use the generated

```
localhost.crt
localhost.key
```

from mkcert.

---

# Docker Network Issue

Traefik reported

```
Could not find network
```

Reason

Traefik attempted to use a network name that did not exist.

Solution

Each exposed service explicitly specifies the correct Docker network.

Example

Frontend

```
public-net
```

Backend

```
public-net
```

Grafana

```
monitoring-net
```

Prometheus

```
monitoring-net
```

cAdvisor

```
monitoring-net
```

---

# Final URLs

| Service           | URL                             |
| ----------------- | ------------------------------- |
| Frontend          | https://app.local               |
| Backend API       | https://api.local               |
| Traefik Dashboard | https://traefik.local/dashboard |
| Grafana           | https://grafana.local           |
| Prometheus        | https://prometheus.local        |
| cAdvisor          | https://cadvisor.local          |

---

# Lessons Learned

* Host-based routing is cleaner than path-based routing.
* Some applications (such as cAdvisor) cannot operate correctly behind a stripped path prefix.
* mkcert provides trusted HTTPS certificates for local development.
* Traefik routes requests using the HTTP Host header.
* Docker networks should be designed around service communication rather than browser access.
* Production-like local environments simplify deployment to staging and production.

---

# Future Improvements

* Let's Encrypt for production deployment.
* Automatic HTTP → HTTPS redirection.
* Authentication middleware for Traefik Dashboard.
* Loki + Promtail integration.
* Redis caching.
* MySQL backup service.
* CI/CD deployment using GitHub Actions.
* Kubernetes deployment using Traefik Ingress Controller.

# Implementation Summary

## Objective

Upgrade the Docker Compose application from a simple development environment into a production-oriented architecture by introducing a modern reverse proxy, HTTPS, monitoring, service discovery, and better network isolation.

---

# Completed Features

## 1. Reverse Proxy Migration

### Before

* NGINX Reverse Proxy
* Static configuration
* HTTP only

### After

* Traefik v3
* Automatic Docker Service Discovery
* Dynamic Routing
* HTTPS Support
* Dashboard Enabled

---

## 2. HTTPS Configuration

Implemented HTTPS for all local services using **mkcert**.

### Features

* Trusted local Certificate Authority
* Browser trusted certificates
* TLS termination handled by Traefik

Implemented certificates for

* localhost
* app.local
* api.local
* traefik.local
* grafana.local
* prometheus.local
* cadvisor.local

---

## 3. Local Development Domains

Replaced localhost ports with readable local domains.

| Service           | Domain           |
| ----------------- | ---------------- |
| Frontend          | app.local        |
| Backend API       | api.local        |
| Traefik Dashboard | traefik.local    |
| Grafana           | grafana.local    |
| Prometheus        | prometheus.local |
| cAdvisor          | cadvisor.local   |

Benefits

* Easier testing
* Production-like environment
* Cleaner URLs
* Simpler routing rules

---

## 4. Traefik Host-Based Routing

Implemented routing based on the **Host** header.

Examples

```text
app.local
api.local
grafana.local
prometheus.local
cadvisor.local
```

instead of

```text
localhost/grafana
localhost/prometheus
localhost/cadvisor
```

Advantages

* No PathPrefix conflicts
* Simpler configuration
* Easier maintenance
* Matches production deployments

---

## 5. Docker Networks

Implemented network isolation.

### public-net

Accessible through Traefik

Contains

* Traefik
* Frontend
* Backend

---

### private-net

Internal application communication

Contains

* Backend
* MySQL
* Redis

---

### monitoring-net

Monitoring services

Contains

* Traefik
* Grafana
* Prometheus
* cAdvisor

Benefits

* Better security
* Reduced network exposure
* Production-ready topology

---

## 6. Backend Load Balancing

Scaled backend service.

Implemented

* Multiple Backend Containers
* Automatic Load Balancing
* Service Discovery

Traefik distributes requests automatically across backend instances.

---

## 7. Monitoring Stack

Integrated monitoring services.

### Prometheus

* Metrics Collection

### Grafana

* Dashboard Visualization

### cAdvisor

* Container Metrics

All services are accessible securely through Traefik.

---

## 8. Traefik Dashboard

Configured Traefik Dashboard over HTTPS.

Available at

```text
https://traefik.local/dashboard/
```

---

## 9. TLS Configuration

Configured static certificates inside Traefik.

Implemented

* Certificate loading
* TLS termination
* HTTPS routing

---

## 10. Docker Provider

Configured Traefik Docker Provider.

Features

* Automatic service discovery
* Dynamic router creation
* Dynamic service creation
* Dynamic middleware creation

---

## 11. Service Labels

Configured Docker labels for

* Routers
* Services
* EntryPoints
* TLS
* Networks

This allows Traefik to discover containers automatically without editing Traefik configuration whenever a new service is added.

---

# Problems Solved

## API Routing Conflict

Problem

Traefik Dashboard intercepted `/api`.

Solution

Separated Dashboard API from Backend API.

---

## cAdvisor Redirect Problem

Problem

cAdvisor redirected

```text
/containers
```

instead of

```text
/cadvisor/containers
```

Solution

Moved cAdvisor to its own hostname.

---

## Certificate Issues

Solved

* Invalid certificate
* PEM parsing errors
* HTTPS trust issues

using mkcert.

---

## ACME Permission Issue

Corrected

```text
acme.json
```

permissions.

---

## Docker Provider Connection

Resolved Docker API communication issues between Traefik and Docker Engine.

---

## Network Discovery

Configured Traefik to communicate with services through their correct Docker networks.

---

# Technologies Used

* Docker Compose
* Traefik v3
* mkcert
* Prometheus
* Grafana
* cAdvisor
* Node.js
* React
* MySQL

---

# Result

The platform now provides

* HTTPS by default
* Automatic reverse proxy
* Production-like local domains
* Dynamic routing
* Backend load balancing
* Monitoring dashboard
* Secure Docker networking
* Simplified service management

The local development environment now closely resembles a production deployment, making future migration to a VPS, Kubernetes, or cloud platform significantly easier.

# Local Development Domains

## Why Local Domains?

Instead of accessing services using ports such as

```text
http://localhost:3000
http://localhost:9090
http://localhost:8080
```

we expose each service through a meaningful hostname.

| Service           | Domain           |
| ----------------- | ---------------- |
| Frontend          | app.local        |
| Backend API       | api.local        |
| Traefik Dashboard | traefik.local    |
| Grafana           | grafana.local    |
| Prometheus        | prometheus.local |
| cAdvisor          | cadvisor.local   |

This approach closely resembles a production environment where services are accessed by domain names instead of ports.

---

# Step 1 – Configure Local DNS Resolution

Edit the hosts file.

Ubuntu

```bash
sudo nano /etc/hosts
```

Add the following entries

```text
127.0.0.1 app.local
127.0.0.1 api.local
127.0.0.1 traefik.local
127.0.0.1 grafana.local
127.0.0.1 prometheus.local
127.0.0.1 cadvisor.local
```

Save the file.

Verify

```bash
ping app.local
```

Expected

```text
PING app.local (127.0.0.1)
```

---

# Step 2 – Generate Trusted Certificates

Install mkcert

```bash
sudo apt install mkcert
sudo apt install libnss3-tools
```

Install the local Certificate Authority

```bash
mkcert -install
```

Generate certificates

```bash
mkcert \
localhost \
127.0.0.1 \
::1 \
app.local \
api.local \
traefik.local \
grafana.local \
prometheus.local \
cadvisor.local
```

Example output

```text
localhost+8.pem
localhost+8-key.pem
```

Rename

```bash
mv localhost+8.pem localhost.crt
mv localhost+8-key.pem localhost.key
```

Copy them into

```text
traefik/certs/
```

---

# Step 3 – Configure Traefik

Load the certificates

```yaml
tls:
  certificates:
    - certFile: /certs/localhost.crt
      keyFile: /certs/localhost.key
```

Traefik now terminates HTTPS for every local domain.

---

# Step 4 – Configure Docker Labels

Instead of routing by URL path

```text
https://localhost/grafana
https://localhost/prometheus
https://localhost/cadvisor
```

each service is routed by hostname.

Frontend

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.frontend.rule=Host(`app.local`)
```

Backend

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.backend.rule=Host(`api.local`)
```

Grafana

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.grafana.rule=Host(`grafana.local`)
```

Prometheus

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.prometheus.rule=Host(`prometheus.local`)
```

cAdvisor

```yaml
labels:
  - traefik.enable=true
  - traefik.http.routers.cadvisor.rule=Host(`cadvisor.local`)
```

Traefik Dashboard

```yaml
rule: Host(`traefik.local`) && PathPrefix(`/dashboard`)
```

---

# How Routing Works

When a browser requests

```text
https://grafana.local
```

it sends

```http
Host: grafana.local
```

Traefik inspects the **Host** header and matches it to the Grafana router.

```
Browser
    │
Host: grafana.local
    │
    ▼
Traefik
    │
Router: grafana
    │
    ▼
Grafana Container
```

The same process occurs for every service.

```
app.local         → Frontend
api.local         → Backend
grafana.local     → Grafana
prometheus.local  → Prometheus
cadvisor.local    → cAdvisor
traefik.local     → Traefik Dashboard
```

---

# Benefits

* Production-like development environment.
* No need to remember different ports.
* Cleaner Traefik configuration using only `Host()` rules.
* Avoids `PathPrefix` conflicts and redirect issues.
* Applications such as cAdvisor work correctly because they are served from the root (`/`) of their own domain.
* Easier migration to staging and production environments where each service already has its own hostname.
