#-----------------
# build
#
echo "------------------------------------------------------------------------------"
echo "Cleaning..."
sozo clean -P sepolia
echo "Building..."
sozo build -P sepolia

#-----------------
# migrate
#
echo ">>> Migrate"
sozo migrate -P sepolia
echo "👍"

#-----------------
# get deployed addresses
#

export MANIFEST_FILE_PATH="./manifest_sepolia.json"

get_contract_address () {
  local TAG=$1
  local RESULT=$(cat $MANIFEST_FILE_PATH | jq -r ".contracts[] | select(.tag == \"$TAG\" ).address")
  if [[ -z "$RESULT" ]]; then
    >&2 echo "get_contract_address($TAG) not found! 👎"
  fi
  echo $RESULT
}

export TOURNAMENTS_ADDRESS=$(get_contract_address "budokan_1_0_8-Budokan")

#-----------------
# addresses
#
echo ">>> Addresses"
echo "TOURNAMENTS_ADDRESS: $TOURNAMENTS_ADDRESS"