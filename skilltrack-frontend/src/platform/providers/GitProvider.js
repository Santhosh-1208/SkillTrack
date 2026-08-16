import { BaseProvider } from './BaseProvider.js';

class VirtualFileSystem {
  constructor() {
    // Flat map of paths to file content or directory marker
    this.files = {
      '/project': { type: 'dir' },
      '/project/package.json': { type: 'file', content: '{\n  "name": "app"\n}' },
      '/project/src': { type: 'dir' },
      '/project/src/auth': { type: 'dir' },
      '/project/src/auth/login.js': { type: 'file', content: 'export function login() {\n  return "old login";\n}' }
    };
    this.cwd = '/project';
  }

  resolvePath(p) {
    if (!p) return this.cwd;
    if (p.startsWith('/')) return p;
    if (p === '.') return this.cwd;
    if (p === '..') {
      const parts = this.cwd.split('/').filter(Boolean);
      parts.pop();
      return '/' + parts.join('/');
    }
    return this.cwd === '/' ? `/${p}` : `${this.cwd}/${p}`;
  }

  ls(p = this.cwd) {
    const target = this.resolvePath(p);
    if (!this.files[target] || this.files[target].type !== 'dir') return `ls: cannot access '${p}': No such file or directory`;
    const children = Object.keys(this.files)
      .filter(f => f.startsWith(target + '/') && f !== target)
      .map(f => {
        const relative = f.slice(target.length === 1 ? 1 : target.length + 1);
        return relative.split('/')[0]; // only immediate children
      });
    return [...new Set(children)].join('  ');
  }

  cd(p) {
    const target = this.resolvePath(p);
    if (!this.files[target]) return `bash: cd: ${p}: No such file or directory`;
    if (this.files[target].type !== 'dir') return `bash: cd: ${p}: Not a directory`;
    this.cwd = target;
    return '';
  }

  cat(p) {
    const target = this.resolvePath(p);
    if (!this.files[target]) return `cat: ${p}: No such file or directory`;
    if (this.files[target].type === 'dir') return `cat: ${p}: Is a directory`;
    return this.files[target].content;
  }

  writeFile(p, content) {
    const target = this.resolvePath(p);
    // Auto-create parent dirs for simplicity
    const parts = target.split('/').filter(Boolean);
    let curr = '';
    for (let i = 0; i < parts.length - 1; i++) {
      curr += '/' + parts[i];
      if (!this.files[curr]) this.files[curr] = { type: 'dir' };
    }
    this.files[target] = { type: 'file', content };
  }

  echo(args) {
    // Very simple echo "text" > file or >> file
    const appendMatch = args.match(/^(.*?)\s*>>\s*(.+)$/);
    if (appendMatch) {
      let content = appendMatch[1].replace(/^["']|["']$/g, '');
      const file = this.resolvePath(appendMatch[2]);
      const existing = this.files[file] ? this.files[file].content : '';
      this.writeFile(file, existing + (existing ? '\n' : '') + content);
      return '';
    }
    const writeMatch = args.match(/^(.*?)\s*>\s*(.+)$/);
    if (writeMatch) {
      let content = writeMatch[1].replace(/^["']|["']$/g, '');
      const file = this.resolvePath(writeMatch[2]);
      this.writeFile(file, content);
      return '';
    }
    return args.replace(/^["']|["']$/g, '');
  }

  rm(p) {
    const target = this.resolvePath(p);
    if (!this.files[target]) return `rm: cannot remove '${p}': No such file or directory`;
    delete this.files[target];
    return '';
  }
}

class GitEmulator {
  constructor(vfs) {
    this.vfs = vfs;
    this.commits = [
      { hash: '5a4b3c2', message: 'Initial commit', branch: 'main' },
      { hash: '9f8e7d6', message: 'Update dependencies', branch: 'main' },
      { hash: 'a1b2c3d', message: 'Refactor auth flow', branch: 'feature/login' }
    ];
    this.currentBranch = 'feature/login';
    this.staged = new Set();
    this.remoteFetched = false;
    this.lastCommand = null;        // tracks the full last command string
    this.mergeEverAttempted = false; // sticky flag — never resets

    // Specific mission states
    this.mergeState = null; // 'CONFLICT', 'RESOLVED'
    this.pushed = false;
  }

  status() {
    let out = `On branch ${this.currentBranch}\n`;
    if (this.mergeState === 'CONFLICT') {
      out += `You have unmerged paths.\n  (fix conflicts and run "git commit")\n\nUnmerged paths:\n  (use "git add <file>..." to mark resolution)\n\tboth modified:   src/auth/login.js\n`;
    } else if (this.mergeState === 'RESOLVED') {
      out += `All conflicts fixed but you are still merging.\n  (use "git commit" to conclude merge)\n`;
    } else {
      out += `nothing to commit, working tree clean\n`;
    }
    return out.trim();
  }

  log(args) {
    let history = [...this.commits].reverse();
    if (args.includes('--oneline')) {
      return history.map(c => `${c.hash} ${c.message}`).join('\n');
    }
    return history.map(c => `commit ${c.hash}\nAuthor: Learner <learner@skilltrack.local>\nDate:   Today\n\n    ${c.message}\n`).join('\n');
  }

  fetch(args) {
    this.remoteFetched = true;
    return `remote: Enumerating objects: 5, done.\nremote: Counting objects: 100% (5/5), done.\nUnpacking objects: 100% (3/3), 400 bytes | 400.00 KiB/s, done.\nFrom github.com:skilltrack/frontend\n   a1b2c3d..e4f5g6h  main       -> origin/main`;
  }

  merge(args) {
    if (!this.remoteFetched) {
      return `fatal: 'origin/main' does not point to a commit`;
    }
    if (args.includes('origin/main') || args.includes('main')) {
      this.mergeState = 'CONFLICT';
      
      // Inject the merge conflict into the VFS
      this.vfs.writeFile('src/auth/login.js', `<<<<<<< HEAD\nexport function login() {\n  return "feature auth";\n}\n=======\nexport function login(user) {\n  return "main auth";\n}\n>>>>>>> origin/main`);
      
      return `Auto-merging src/auth/login.js\nCONFLICT (content): Merge conflict in src/auth/login.js\nAutomatic merge failed; fix conflicts and then commit the result.`;
    }
    return `fatal: not something we can merge`;
  }

  add(args) {
    if (this.mergeState === 'CONFLICT') {
      // Check if file still has conflict markers
      const content = this.vfs.cat('src/auth/login.js');
      if (content.includes('<<<<<<<') || content.includes('=======')) {
        return `error: 'src/auth/login.js' still contains conflict markers.`;
      }
      this.mergeState = 'RESOLVED';
      this.staged.add('src/auth/login.js');
      return '';
    }
    return '';
  }

  commit(args) {
    if (this.mergeState === 'CONFLICT') {
      return `error: Committing is not possible because you have unmerged files.\nhint: Fix them up in the work tree, and then use 'git add/rm <file>'\nhint: as appropriate to mark resolution and make a commit.`;
    }
    if (this.mergeState === 'RESOLVED') {
      const msgMatch = args.match(/-m\s+["']([^"']+)["']/);
      const msg = msgMatch ? msgMatch[1] : 'Merge origin/main into feature/login';
      this.commits.push({ hash: 'e4f5g6h', message: msg, branch: this.currentBranch });
      this.mergeState = null;
      this.staged.clear();
      return `[${this.currentBranch} e4f5g6h] ${msg}`;
    }
    return `On branch ${this.currentBranch}\nnothing to commit, working tree clean`;
  }

  push(args) {
    if (this.mergeState) return `error: you are in the middle of a merge`;
    if (this.commits[this.commits.length - 1].hash === 'e4f5g6h') {
      this.pushed = true;
      return `Enumerating objects: 7, done.\nCounting objects: 100% (7/7), done.\nWriting objects: 100% (3/3), 350 bytes | 350.00 KiB/s, done.\nTo github.com:skilltrack/frontend.git\n   e4f5g6h..x9y8z7w  feature/login -> feature/login`;
    }
    return `Everything up-to-date`;
  }
}

export class GitProvider extends BaseProvider {
  constructor(id, config = {}) {
    super(id, config);
    this.vfs = new VirtualFileSystem();
    this.git = new GitEmulator(this.vfs);
  }

  async init() {
    await super.init();
  }

  async getState() {
    return {
      lastCommand: this.git.lastCommand,
      fetched: this.git.remoteFetched,
      mergeAttempted: this.git.mergeEverAttempted,
      conflictResolved: this.git.mergeEverAttempted && (this.git.mergeState === 'RESOLVED' || this.git.commits.some(c => c.hash === 'e4f5g6h')),
      pushed: this.git.pushed
    };
  }

  async executeCommand(command) {
    const cmdStr = command.trim();
    if (!cmdStr) return '';
    
    const parts = cmdStr.split(' ');
    const baseCmd = parts[0];
    const args = parts.slice(1).join(' ');

    try {
      // VFS Shell Commands
      if (baseCmd === 'pwd') return this.vfs.cwd;
      if (baseCmd === 'ls') return this.vfs.ls(args);
      if (baseCmd === 'cd') return this.vfs.cd(args);
      if (baseCmd === 'cat') return this.vfs.cat(args);
      if (baseCmd === 'echo') return this.vfs.echo(args);
      if (baseCmd === 'rm') return this.vfs.rm(args);
      if (baseCmd === 'clear') return ''; // Handled by frontend usually
      if (baseCmd === 'help') {
        return `SimOS Git Terminal — Available Commands:
  git fetch [origin]        Fetch latest changes from remote
  git merge origin/main     Merge main branch into current branch
  git status                Show working tree status
  git log [--oneline]       Show commit logs
  git add <file>            Stage resolved file for commit
  git commit -m "message"   Commit changes
  git push                  Push changes to remote repository
  ls, cd, cat, echo, pwd    File system commands`;
      }
      if (baseCmd === 'nano' || baseCmd === 'vim' || baseCmd === 'vi') {
        // Simple mock for editors — tell learner to use echo for this specific scenario
        return `Hint for SimOS: To resolve the conflict in this terminal, you can rewrite the file using 'echo' like this:\n  echo "export function login() { return 'merged'; }" > src/auth/login.js`;
      }

      // Git Commands
      if (baseCmd === 'git') {
        const subCmd = parts[1];
        const gitArgs = parts.slice(2).join(' ');
        // Always record the full command so rules can match it
        this.git.lastCommand = cmdStr;

        switch (subCmd) {
          case 'status': return this.git.status();
          case 'log': return this.git.log(gitArgs);
          case 'fetch': return this.git.fetch(gitArgs);
          case 'merge': {
            const out = this.git.merge(gitArgs);
            if (gitArgs.includes('origin/main') || gitArgs.includes('main')) {
              this.git.mergeEverAttempted = true;
            }
            return out;
          }
          case 'add': return this.git.add(gitArgs);
          case 'commit': return this.git.commit(gitArgs);
          case 'push': return this.git.push(gitArgs);
          case 'branch': return `* feature/login\n  main`;
          case 'checkout': return `Switched to branch '${gitArgs}'`;
          default:
            return `git: '${subCmd}' is not a git command. See 'git --help'.`;
        }
      }

      return `bash: ${baseCmd}: command not found`;
    } catch (e) {
      return `Error executing command: ${e.message}`;
    }
  }
}
