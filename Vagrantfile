Vagrant.configure(2) do |config|

  config.vm.box = "phusion/ubuntu-14.04-amd64"
  config.vm.box_url = "https://oss-binaries.phusionpassenger.com/vagrant/boxes/latest/ubuntu-14.04-amd64-vmwarefusion.box"
  config.vm.hostname = "daedalus.consul"

  config.vm.provider "vmware_fusion" do |v|
    v.vmx["memsize"] = "1024"
    v.vmx["numvcpus"] = "1"
  end

  config.vm.provision "shell", inline: <<-SHELL
     sudo apt-get update
     sudo apt-get upgrade -y
  SHELL

  config.vm.provision :docker do |d|
  	d.pull_images "progrium/consul"
  	d.run "consul-server1",
  		image: "progrium/consul",
  		cmd: "-server -bootstrap -dc daedalus-spec",
  		args: "-h consul-server1 --restart=always"

  	d.run "consul-agent1",
  		image: "progrium/consul",
  		cmd: "-join server1 -dc daedalus-spec",
  		args: "-h consul-agent1 --restart=always --link consul-server1:server1 -p 8400:8400 -p 8500:8500 -p 8600:53/udp"
  end

  config.vm.provision "shell", run: "always", inline: <<-SHELL
     docker start consul-server1
     docker start consul-agent1
  SHELL

  # Create a forwarded port mapping which allows access to a specific port
  # within the machine from a port on the host machine. In the example below,
  # accessing "localhost:8080" will access port 80 on the guest machine.
  config.vm.network "forwarded_port", guest: 8400, host: 8401
  config.vm.network "forwarded_port", guest: 8500, host: 8501
  config.vm.network "forwarded_port", guest: 53, host: 8601

  # Create a private network, which allows host-only access to the machine
  # using a specific IP.
  config.vm.network "private_network", ip: "192.168.33.10"
end
