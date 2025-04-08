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

export TOURNAMENTS_ADDRESS=$(get_contract_address "budokan_v_1_0_5-tournament_mock")
export GAME_ADDRESS=$(get_contract_address "budokan_v_1_0_5-game_mock")
export TEST_ERC20=$(get_contract_address "budokan_v_1_0_5-erc20_mock")
export TEST_ERC721=$(get_contract_address "budokan_v_1_0_5-erc721_mock")

#-----------------
# initialize tournament
#
echo ">>> Initialize tournament"
echo "GAME_ADDRESS: $GAME_ADDRESS"
echo "TOURNAMENTS_ADDRESS: $TOURNAMENTS_ADDRESS"
echo "TEST_ERC20: $TEST_ERC20"
echo "TEST_ERC721: $TEST_ERC721"

echo "Waiting 10 seconds before execution..."
sleep 10

sozo -P slot execute tournament_mock initializer 0 1 $TEST_ERC20 $TEST_ERC721
sozo -P slot execute game_mock initializer

#------------------
echo "--- DONE! 👍"