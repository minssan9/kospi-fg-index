# Security Guide

Comprehensive security guide for the Fear & Greed Index production deployment.

## Security Architecture Overview

The security model follows defense-in-depth principles with multiple layers:

```
Internet → CloudFlare/WAF → Firewall → nginx → Application → Database
          ↓                ↓           ↓        ↓             ↓
       DDoS Protection   UFW + fail2ban  SSL/TLS  JWT Auth    Encrypted
       Bot Protection   Port Filtering   Headers  Rate Limits  Storage
```

## Network Security

### Firewall Configuration (UFW)

The setup script configures UFW with minimal required ports:

```bash
# View current firewall status
sudo ufw status verbose

# Rules configured by setup script:
# - SSH (22/tcp) - Limited to specific IPs if configured
# - HTTP (80/tcp) - For SSL certificate challenges only
# - HTTPS (443/tcp) - Primary application access
# - Docker networks (172.16.0.0/12, 192.168.0.0/16, 10.0.0.0/8)
```

#### Additional Hardening
```bash
# Limit SSH to specific IP ranges (recommended)
sudo ufw delete allow ssh
sudo ufw allow from YOUR_IP_RANGE to any port 22

# Rate limit SSH connections
sudo ufw limit ssh

# Deny all other traffic by default
sudo ufw default deny incoming
sudo ufw default allow outgoing
```

### fail2ban Configuration

Protects against brute force attacks:

```bash
# Check fail2ban status
sudo fail2ban-client status

# View banned IPs
sudo fail2ban-client status sshd
sudo fail2ban-client status nginx-http-auth

# Unban an IP if needed
sudo fail2ban-client set sshd unbanip IP_ADDRESS
```

#### Custom Filters

Additional nginx filters configured in `/etc/fail2ban/jail.local`:
- `nginx-req-limit`: Rate limiting violations
- `nginx-botsearch`: Bot/scanner detection
- `nginx-http-auth`: Authentication failures

## SSL/TLS Security

### Certificate Configuration

Using Let's Encrypt with A+ SSL rating:

```bash
# Check SSL certificate status
sudo certbot certificates

# Test SSL configuration
curl -I https://investand.voyagerss.com
openssl s_client -connect investand.voyagerss.com:443 -servername investand.voyagerss.com
```

### SSL Security Headers

Configured in `nginx.prod.conf`:
```nginx
# HSTS - Force HTTPS for 2 years
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;

# Prevent clickjacking
add_header X-Frame-Options DENY always;

# Prevent MIME sniffing
add_header X-Content-Type-Options nosniff always;

# XSS Protection
add_header X-XSS-Protection "1; mode=block" always;

# Referrer Policy
add_header Referrer-Policy "strict-origin-when-cross-origin" always;

# Content Security Policy
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.jsdelivr.net unpkg.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; font-src 'self' fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' https:; media-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';" always;
```

### SSL Testing

Test SSL configuration using external tools:
- **SSL Labs**: https://www.ssllabs.com/ssltest/
- **Mozilla Observatory**: https://observatory.mozilla.org/
- **Security Headers**: https://securityheaders.com/

Target ratings:
- SSL Labs: A+
- Mozilla Observatory: A+
- Security Headers: A

## Application Security

### Authentication & Authorization

#### JWT Token Security
```env
# Use a strong, randomly generated secret (minimum 32 characters)
JWT_SECRET=your_jwt_secret_minimum_32_characters_long_and_random

# Token expiration settings
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
```

#### Admin Authentication
```env
# Use strong passwords
ADMIN_PASSWORD=ComplexPassword123!WithSpecialChars

# Enable MFA for admin accounts (if implemented)
MFA_ENABLED=true
```

#### Rate Limiting
```env
# API rate limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100  # 100 requests per window

# Different limits for different endpoints
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX_REQUESTS=5  # Stricter for auth endpoints
```

### Input Validation & Sanitization

#### API Security Measures
1. **Input validation** using Joi or similar validation libraries
2. **SQL injection protection** via Prisma ORM parameterized queries
3. **XSS prevention** through output encoding
4. **CSRF protection** using tokens
5. **File upload restrictions** (if applicable)

#### Database Security
```javascript
// Example secure database query using Prisma
const user = await prisma.user.findUnique({
  where: {
    id: parseInt(userId), // Input validation
  },
  select: {
    id: true,
    username: true,
    // Don't expose sensitive fields like password
  }
});
```

### CORS Configuration

Restrict cross-origin requests:
```javascript
// In production, restrict CORS to specific origins
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://investand.voyagerss.com'] 
    : true,
  credentials: true,
  optionsSuccessStatus: 200
};
```

## Container Security

### Docker Security Best Practices

#### Non-root Users
All containers run as non-root users:
```dockerfile
# Backend Dockerfile
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodejs
USER nodejs
```

#### Minimal Base Images
Using Alpine Linux for smaller attack surface:
```dockerfile
FROM node:18-alpine AS base
FROM nginx:1.25-alpine
FROM postgres:15-alpine
```

#### Security Scanning

Run security scans on container images:
```bash
# Scan Docker images for vulnerabilities
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image your-image-name

# Scan for secrets in code
docker run --rm -v $(pwd):/src trufflesecurity/trufflehog \
  filesystem /src --only-verified
```

### Container Network Security

#### Network Isolation
```yaml
# docker-compose.prod.yml
networks:
  fg-network:
    driver: bridge
    name: fg-prod-network
    ipam:
      driver: default
      config:
        - subnet: 172.20.0.0/16
```

#### Service Communication
- Internal services communicate via Docker network
- Only nginx exposes ports to host
- Database and Redis only accessible from application containers

## Database Security

### PostgreSQL Hardening

#### Access Control
```env
# Strong database credentials
DATABASE_USER=fg_user
DATABASE_PASSWORD=SecureRandomPassword123!
DATABASE_NAME=fg_index_prod
```

#### Configuration Security
```sql
-- Disable unnecessary extensions
DROP EXTENSION IF EXISTS plpgsql CASCADE;

-- Set secure connection parameters
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET log_connections = on;
ALTER SYSTEM SET log_disconnections = on;
ALTER SYSTEM SET log_statement = 'all';
```

#### Connection Security
```yaml
# docker-compose.prod.yml - Database only accessible internally
database:
  ports:
    - "127.0.0.1:5432:5432"  # Only localhost access
  environment:
    POSTGRES_INITDB_ARGS: "--encoding=UTF-8 --lc-collate=C --lc-ctype=C"
```

### Data Encryption

#### At Rest
- Database storage encrypted using filesystem encryption
- Backup files encrypted before storage
- Environment variables stored securely

#### In Transit
- All API communications over HTTPS
- Database connections encrypted
- Internal Docker network communication

## API Key Security

### Secure Storage
```bash
# API keys stored as environment variables, never in code
KIS_API_KEY=your_api_key_here
KIS_API_SECRET=your_api_secret_here

# Use GitHub Secrets for CI/CD
# Never commit API keys to repository
```

### Key Rotation Policy
- **Quarterly**: Rotate API keys for external services
- **Monthly**: Rotate JWT secrets and admin passwords
- **Weekly**: Review access logs for anomalies
- **Daily**: Monitor for exposed credentials in logs

### Key Validation
```javascript
// Validate API keys on startup
const validateApiKeys = () => {
  const requiredKeys = ['KIS_API_KEY', 'KIS_API_SECRET', 'BOK_API_KEY'];
  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  
  if (missingKeys.length > 0) {
    throw new Error(`Missing required API keys: ${missingKeys.join(', ')}`);
  }
};
```

## Logging & Monitoring Security

### Security Logging

Log security-relevant events:
```javascript
// Security event logging
logger.security('Failed authentication attempt', {
  ip: req.ip,
  userAgent: req.get('User-Agent'),
  timestamp: new Date().toISOString()
});

logger.security('Admin access', {
  user: user.id,
  action: 'admin_dashboard_access',
  ip: req.ip
});
```

### Log Protection
```bash
# Protect log files from unauthorized access
sudo chown -R fg-app:fg-app /opt/fg-index/logs
sudo chmod -R 640 /opt/fg-index/logs

# Never log sensitive information
# - Passwords
# - API keys
# - JWT tokens
# - Personal information
```

### Monitoring Alerts

Configure security alerts:
```bash
# Monitor for security events
grep -i "authentication failed\|unauthorized\|forbidden" /opt/fg-index/logs/**/*.log

# Alert on suspicious patterns
# - Multiple failed login attempts
# - Unusual API usage patterns
# - High error rates
# - Unexpected admin access
```

## Backup Security

### Backup Encryption
```bash
# Encrypt backups before storage
gpg --symmetric --cipher-algo AES256 backup_file.sql
```

### Secure Storage
```env
# S3 backup configuration with encryption
BACKUP_S3_BUCKET=fg-index-backups-encrypted
AWS_S3_SERVER_SIDE_ENCRYPTION=AES256
```

### Access Control
```bash
# Restrict backup access
chmod 600 /opt/fg-index/backups/*
chown fg-app:fg-app /opt/fg-index/backups/*
```

## Security Monitoring & Incident Response

### Security Monitoring Checklist

Daily automated checks:
- [ ] Failed authentication attempts
- [ ] Unusual traffic patterns
- [ ] SSL certificate status
- [ ] Container security status
- [ ] Database access logs
- [ ] API rate limit violations

### Incident Response Plan

#### 1. Detection
- Monitor security alerts and logs
- Set up automated alerting for security events
- Regular security scans and audits

#### 2. Containment
```bash
# Emergency response procedures

# Block suspicious IP
sudo ufw insert 1 deny from SUSPICIOUS_IP

# Disable compromised user
docker exec fg-backend-prod npm run disable-user USER_ID

# Rotate compromised credentials
# 1. Change passwords
# 2. Rotate API keys
# 3. Invalidate JWT tokens
```

#### 3. Investigation
- Analyze logs for attack patterns
- Document security incident
- Assess damage and data exposure

#### 4. Recovery
- Restore from clean backups if needed
- Apply security patches
- Update security measures

#### 5. Lessons Learned
- Update security procedures
- Implement additional monitoring
- Security team debrief

### Security Audit Checklist

Monthly security audit:
- [ ] Review access logs for anomalies
- [ ] Check for unauthorized configuration changes
- [ ] Verify SSL certificate status and security headers
- [ ] Update dependencies and security patches
- [ ] Review API key usage and rotate if needed
- [ ] Test backup and recovery procedures
- [ ] Verify firewall and fail2ban configurations
- [ ] Check container security scan results
- [ ] Review database access patterns
- [ ] Validate monitoring and alerting systems

## Compliance & Best Practices

### Security Standards Compliance

Following industry standards:
- **OWASP Top 10**: Address common web vulnerabilities
- **CIS Controls**: Critical security controls implementation
- **NIST Cybersecurity Framework**: Identify, Protect, Detect, Respond, Recover

### Security Best Practices

#### Development
- Security code reviews
- Dependency vulnerability scanning
- Static code analysis
- Security testing in CI/CD pipeline

#### Operations
- Principle of least privilege
- Regular security updates
- Monitoring and logging
- Incident response procedures

#### Data Protection
- Data encryption at rest and in transit
- Regular backups with encryption
- Data retention policies
- Privacy protection measures

## Emergency Procedures

### Security Incident Response

#### Immediate Actions (< 15 minutes)
1. **Identify**: Confirm security incident
2. **Contain**: Block malicious traffic
3. **Isolate**: Disable compromised accounts
4. **Alert**: Notify security team

#### Short-term Response (< 1 hour)
1. **Analyze**: Review logs and attack patterns
2. **Document**: Record all incident details
3. **Communicate**: Update stakeholders
4. **Mitigate**: Apply temporary fixes

#### Recovery (< 24 hours)
1. **Restore**: From clean backups if needed
2. **Patch**: Apply security updates
3. **Verify**: Ensure system integrity
4. **Monitor**: Enhanced monitoring post-incident

### Emergency Contacts

Configure emergency notification channels:
- **Primary**: Slack #security-alerts channel
- **Secondary**: Email security team
- **Escalation**: Phone calls for critical incidents

## Security Tools & Resources

### Recommended Security Tools

#### Vulnerability Scanning
- **Trivy**: Container vulnerability scanning
- **OWASP ZAP**: Web application security testing
- **Nessus**: Network vulnerability assessment

#### Monitoring
- **fail2ban**: Intrusion prevention
- **OSSEC**: Host-based intrusion detection
- **ELK Stack**: Log analysis and SIEM

#### Development
- **SonarQube**: Static code analysis
- **Snyk**: Dependency vulnerability scanning
- **GitSecrets**: Prevent secret commits

### External Resources

- [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [CIS Docker Benchmark](https://www.cisecurity.org/benchmark/docker)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [Mozilla Web Security Guidelines](https://infosec.mozilla.org/guidelines/web_security)

## Security Contact Information

For security issues and vulnerabilities:
- **Security Team**: security@investand.voyagerss.com
- **Emergency**: +1-XXX-XXX-XXXX
- **PGP Key**: [Security team public key]

## Disclaimer

This security guide provides recommendations based on current best practices. Security is an ongoing process, and additional measures may be required based on specific threat models and compliance requirements.