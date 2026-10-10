#!/usr/bin/env bash
# Docker's official Ubuntu apt repository. Run only in an Ubuntu host/WSL distro.
set -euo pipefail
. /etc/os-release
if [ "$ID" != ubuntu ]; then echo 'Ubuntuで実行してください'; exit 1; fi
sudo apt-get update
sudo apt-get install -y ca-certificates curl openssl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
ubuntu_codename=${UBUNTU_CODENAME:-$VERSION_CODENAME}
docker_architecture=$(dpkg --print-architecture)
printf 'Types: deb\nURIs: https://download.docker.com/linux/ubuntu\nSuites: %s\nComponents: stable\nArchitectures: %s\nSigned-By: /etc/apt/keyrings/docker.asc\n' "$ubuntu_codename" "$docker_architecture" | sudo tee /etc/apt/sources.list.d/docker.sources > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo service docker start
sudo docker run --rm hello-world
