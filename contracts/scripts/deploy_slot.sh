#-----------------
# build
#
echo "------------------------------------------------------------------------------"
echo "Cleaning..."
sozo clean --profile slot
echo "Building..."
sozo build --profile slot

#-----------------
# migrate
#
echo ">>> Migrate"
sozo migrate --profile slot
echo "👍"

#-----------------
# get deployed addresses
#

export MANIFEST_FILE_PATH="./manifest_slot.json"

get_contract_address () {
  local TAG=$1
  local RESULT=$(cat $MANIFEST_FILE_PATH | jq -r ".contracts[] | select(.tag == \"$TAG\" ).address")
  if [[ -z "$RESULT" ]]; then
    >&2 echo "get_contract_address($TAG) not found! 👎"
  fi
  echo $RESULT
}

export TOURNAMENTS_ADDRESS=$(get_contract_address "budokan_1_0_8-Budokan")
# export TEST_ERC20=$(get_contract_address "budokan_1_0_8-erc20_mock")
# export TEST_ERC721=$(get_contract_address "budokan_1_0_8-erc721_mock")

#------------------
echo "--- DONE! 👍"