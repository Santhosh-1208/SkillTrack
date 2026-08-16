import { BaseProvider } from './BaseProvider.js';

export class UbuntuProvider extends BaseProvider {
  constructor(id, config = {}) {
    super(id, config);
    this.services = {
      apache: { status: 'STOPPED' },
      network: { port80: 'CLOSED', port4444: 'DETECTED' },
      process: { exfil: 'RUNNING' },
      firewall: { port4444: 'OPEN' },
      files: { incident_log: 'MISSING' }
    };
    this.lastCommand = null;
  }

  async init() {
    await super.init();
    // Simulate booting up Ubuntu environment
  }

  async getState() {
    return {
      apache: this.services.apache,
      network: this.services.network,
      process: this.services.process,
      firewall: this.services.firewall,
      files: this.services.files,
      lastCommand: this.lastCommand
    };
  }

  async executeCommand(command) {
    const cmd = command.trim();
    console.log(`[UbuntuProvider] Executing: ${cmd}`);
    this.lastCommand = cmd;
    
    if (cmd === 'help') {
      return `Available commands:
  help                    - Show this message
  uptime                  - Check system load
  top / htop              - View running processes
  systemctl               - Manage services (start, stop, restart, status)
  journalctl              - View system logs
  docker                  - Manage containers (build, run, push)
  kubectl                 - Manage Kubernetes clusters
  shutdown                - Shutdown the system
  kill -9 <PID>           - Terminate process
  ufw                     - Manage firewall
  netstat / ss            - View network connections`;
    } else if (cmd === 'uptime') {
      return ' 14:23:45 up 15 days,  3:12,  1 user,  load average: 3.84, 3.12, 2.95';
    } else if (cmd === 'top' || cmd === 'htop') {
      return `top - 14:24:10 up 15 days,  3:13,  1 user,  load average: 3.90, 3.15, 2.98\nTasks: 112 total,   2 running, 110 sleeping,   0 stopped,   0 zombie\n%Cpu(s): 95.5 us,  3.0 sy,  0.0 ni,  1.5 id,  0.0 wa,  0.0 hi,  0.0 si,  0.0 st\n\n  PID USER      PR  NI    VIRT    RES    SHR S  %CPU  %MEM     TIME+ COMMAND\n  892 www-data  20   0   14.2g  12.1g   4.2g R  99.9  75.2  10:23.14 nginx\n    1 root      20   0  168536  12356   8412 S   0.0   0.1   0:05.12 systemd`;
    } else if (cmd === 'systemctl status nginx') {
      const state = this.services.apache.status === 'RUNNING' ? 'active (running)' : 'failed (Result: signal)';
      return `● nginx.service - A high performance web server and a reverse proxy server\n   Loaded: loaded (/lib/systemd/system/nginx.service; enabled; vendor preset: enabled)\n   Active: ${state}\n   Main PID: 892 (nginx)`;
    } else if (cmd === 'systemctl restart nginx') {
      this.services.apache.status = 'RUNNING';
      return '';
    } else if (cmd.startsWith('docker build')) {
      return 'Sending build context to Docker daemon  2.048kB\nStep 1/5 : FROM node:18-alpine\n ---> 3b82f6a6c1\nStep 2/5 : WORKDIR /app\n ---> 9f1a2e3b82\nStep 3/5 : COPY package.json .\n ---> 6366f18b5c\nStep 4/5 : RUN npm install\n ---> 8b5cf6e2e8\nStep 5/5 : COPY . .\n ---> 22c55ea5b4\nSuccessfully built 22c55ea5b4\nSuccessfully tagged app:v2.0.0';
    } else if (cmd.startsWith('docker push')) {
      return 'The push refers to repository [docker.io/library/app]\n22c55ea5b4: Pushed\nv2.0.0: digest: sha256:abcd1234 size: 1532';
    } else if (cmd === './deploy.sh') {
      return 'Deploying to staging environment...\nConnecting to Kubernetes cluster...\nApplying deployment.yaml...\ndeployment.apps/app configured\nWaiting for rollout to finish...';
    } else if (cmd.startsWith('kubectl rollout undo')) {
      return 'deployment.apps/app rolled back';
    } else if (cmd === 'systemctl stop dev-server') {
      return '';
    } else if (cmd === 'systemctl stop nonprod-db') {
      return '';
    } else if (cmd === 'shutdown +5') {
      return 'Shutdown scheduled for +5 minutes.\nUse "shutdown -c" to cancel.';
    } else if (cmd.includes('netstat') || cmd.includes('ss')) {
      return 'Active Internet connections (only servers)\nProto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name\ntcp        0      0 0.0.0.0:4444            0.0.0.0:*               LISTEN      4821/exfil.sh\ntcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      990/sshd';
    } else if (cmd === 'ps' || cmd === 'ps aux') {
      return 'USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND\nroot           1  0.0  0.1 168536 12356 ?        Ss   Aug01   0:05 /sbin/init\nroot        4821 12.4  0.5  14234  5422 ?        R    02:00   1:23 /bin/bash /tmp/exfil.sh';
    } else if (cmd === 'systemctl start apache2') {
      this.services.apache.status = 'RUNNING';
      this.services.network.port80 = 'OPEN';
      return 'Apache started.';
    } else if (cmd.includes('kill') && cmd.includes('4821')) {
      this.services.process.exfil = 'KILLED';
      return 'Process 4821 terminated.';
    } else if (cmd.includes('ufw deny 4444')) {
      this.services.firewall.port4444 = 'BLOCKED';
      return 'Rule added.';
    } else if (cmd.includes('echo') && cmd.includes('incident.txt')) {
      this.services.files.incident_log = 'WRITTEN';
      return '';
    }
    
    return `Command executed: ${command}`;
  }
}
