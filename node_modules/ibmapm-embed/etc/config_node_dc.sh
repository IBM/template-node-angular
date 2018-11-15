#!/bin/bash
#set -x
cdir=$(dirname "$0")
install_dir=$(cd ${cdir}; pwd -P)
export PATH=${install_dir}:${PATH}
CONFIGPACK_PATH=${1:-onprem_config.tar}
OUTPUT=${2:-../config}
print_help() {
    echo ""
    echo "The data collector will connect to APM server, it needs the configuration package for more configuration details. The configuration package can be generated with the <APM server>/ccm/make_configuration_packages.sh script, the package file name is like onprem_config.tar. The global.environment and keyfile will be generated to [output]."
    echo "Usage: $0 [config tar] [output]"
    echo ""
}

if [ $# -lt 2 ] || [ "$1" = "-help" ]
then
	print_help
	exit 0
fi

if [ -f $CONFIGPACK_PATH ]
then
	if [ -d tmp ] || [ -f tmp ]
	then 
		rm -rf tmp
	fi

	mkdir tmp

	tar tf $CONFIGPACK_PATH > /dev/null 2>&1
	if [ $? -ne 0 ]
	then
		echo -e "Invalid config package: $CONFIGPACK_PATH"
		exit 1
	fi

	tar xf $CONFIGPACK_PATH -C tmp  --warning=no-timestamp
	cd tmp
	# Retrieve the password
	if [ -f configure_agent_images.sh ]
	then
		password=`grep "keyfilePassword" ./configure_agent_images.sh | grep local | awk -F '"' '{print $2}'`
		if [ "$password" = "" ]
		then
			echo -e "Cannot get keyfilePassword from the file configure_agent_images.sh. Exiting..."
			exit 1
		fi
	else
		echo -e "File configure_agent_images.sh doesn't exist in config package. Exiting..."
		exit 1
	fi

	# Retrieve the url
	if [ -f onprem_config.tar ]
	then
		tar xf onprem_config.tar --warning=no-timestamp
		if [ -f .onprem_config/agent_global_env.cfg ]
		then
			url=`grep "BASE_URL" .onprem_config/agent_global_env.cfg | awk -F '=' '{print $2}'`
			if [ "$url" = "" ]
			then
				echo -e "Cannot get BASE_URL from the file onprem_config/agent_global_env.cfg. Exiting..."
				exit 1
			fi
		else
			echo -e "File onprem_config/agent_global_env.cfg doesn't exist in config package. Exiting... "
			exit 1
		fi

		# Get the keyfiles
		if [ ! -f .onprem_config/keyfiles/keyfile.jks ]
		then
			echo -e  "File onprem_config/keyfiles/keyfile.jks doesn't exist in config package. Exiting..."
			exit 1
		fi
	else
		echo -e  "File onprem_config.tar doesn't exist in config package. Exiting..."
		exit 1
	fi
	cd ..
	if [ ! -d $OUTPUT ]
	then 
		mkdir $OUTPUT
	fi
	cp ./tmp/.onprem_config/keyfiles/keyfile.p12 $OUTPUT/keyfile.p12 

	# Update URL                
	echo "" >> $OUTPUT/global.environment

	sed -i "/APM_BM_GATEWAY_URL=/d" $OUTPUT/global.environment
	echo "APM_BM_GATEWAY_URL=${url}" >> $OUTPUT/global.environment

	# Update password
	sed -i "/APM_KEYFILE_PSWD=/d" $OUTPUT/global.environment
	echo "APM_KEYFILE_PSWD=${password}" >> $OUTPUT/global.environment

	# Update keyfile
	sed -i "/APM_KEYFILE=/d" $OUTPUT/global.environment
	echo "APM_KEYFILE=keyfile.p12" >> $OUTPUT/global.environment
	
	
	rm -rf tmp
else
	echo -e  "File $CONFIGPACK_PATH doesn't exist in config package. Exiting..."
	exit 1
fi


