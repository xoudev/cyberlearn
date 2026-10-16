/** Deliberately vulnerable guest setup. Never execute these scripts on a host. */
export const ATTACKER_FILES = {
  "lab-setup.sh": `#!/bin/sh
set -eu
hostname attackbox
ifconfig lo up
ifconfig eth0 10.77.0.1 netmask 255.255.255.0 up
route del default 2>/dev/null || true
ln -sf /usr/bin/dbclient /usr/bin/ssh
`,
  "mission.txt": `Authorized training scope: app01, 10.77.0.2 only.
Discover the SSH port, connect as trainee, inspect permissions, obtain both flags.
Maintenance handover (fictional credentials): trainee / training-only
No gateway, DNS, relay or Internet access exists in this exercise.
`,
};

export const TARGET_FILES = {
  "lab-setup.sh": `#!/bin/sh
set -eu
hostname app01
ifconfig lo up
ifconfig eth0 10.77.0.2 netmask 255.255.255.0 up
route del default 2>/dev/null || true
mkdir -p /home
adduser -D -s /bin/sh trainee
printf 'training-only\ntraining-only\n' | passwd trainee >/dev/null 2>&1
mkdir -p /usr/local/bin /etc/dropbear /mnt/proofs
chown trainee:trainee /mnt/proofs
printf 'CL{ssh_to_app01}\n' > /home/trainee/user.txt
chown trainee:trainee /home/trainee/user.txt
printf 'CL{setuid_is_root}\n' > /root/flag.txt
chmod 700 /root
chmod 600 /root/flag.txt
# Intentional CWE-269: a root-owned setuid bash in the isolated target only.
cp /bin/bash /usr/local/bin/backup
chown root:root /usr/local/bin/backup
chmod 4755 /usr/local/bin/backup
dropbearkey -t ed25519 -f /etc/dropbear/dropbear_ed25519_host_key >/dev/null 2>&1
dropbear -p 10.77.0.2:22 -r /etc/dropbear/dropbear_ed25519_host_key -w -j -k
`,
};

export const TARGET_CHECKS = [
  {
    label: "Le flag utilisateur a été rapporté",
    path: "proofs/user.txt",
    expect: "file",
    contains: "CL{ssh_to_app01}",
  },
  {
    label: "Le flag root a été rapporté",
    path: "proofs/root.txt",
    expect: "file",
    contains: "CL{setuid_is_root}",
  },
] as const;
