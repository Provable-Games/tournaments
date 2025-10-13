import { DOLLAR } from "@/components/Icons";
import { useGameTokens } from "metagame-sdk";
import { useEffect, useMemo, useState } from "react";
import { useAccount } from "@starknet-react/core";
import { BigNumberish } from "starknet";
import EntryCard from "@/components/tournament/myEntries/EntryCard";
import { Tournament } from "@/generated/models.gen";
import {
  TournamentCard,
  TournamentCardTitle,
  TournamentCardHeader,
  TournamentCardContent,
  TournamentCardMetric,
  TournamentCardSwitch,
} from "./containers/TournamentCard";

interface MyEntriesProps {
  tournamentId: BigNumberish;
  gameAddress: string;
  tournamentModel: Tournament;
  totalEntryCount: number;
}

const MyEntries = ({
  tournamentId,
  gameAddress,
  tournamentModel,
  totalEntryCount,
}: MyEntriesProps) => {
  const { address } = useAccount();
  // const state = useDojoStore((state) => state);
  // const { namespace } = useDojo();
  const [showMyEntries, setShowMyEntries] = useState(false);

  const { games: ownedGames, refetch } = useGameTokens({
    context: {
      name: "Budokan",
      attributes: {
        "Tournament ID": tournamentId?.toString() ?? "0",
      },
    },
    owner: address ?? "0x0",
  });

  const myEntriesCount = useMemo(() => {
    return ownedGames?.length ?? 0;
  }, [ownedGames]);

  useEffect(() => {
    if (address) {
      setShowMyEntries(myEntriesCount > 0);
      refetch();
    } else {
      setShowMyEntries(false);
    }
  }, [address, myEntriesCount, totalEntryCount]);

  return (
    <TournamentCard showCard={showMyEntries}>
      <TournamentCardHeader>
        <TournamentCardTitle>My Entries</TournamentCardTitle>
        <div className="flex flex-row items-center gap-2">
          <TournamentCardSwitch
            checked={showMyEntries}
            onCheckedChange={setShowMyEntries}
            showSwitch={address ? myEntriesCount > 0 : false}
            notShowingSwitchLabel={
              address ? "No Entries" : "No Account Connected"
            }
            checkedLabel="Hide"
            uncheckedLabel="Show Entries"
          />
          <TournamentCardMetric icon={<DOLLAR />} metric={myEntriesCount} />
        </div>
      </TournamentCardHeader>
      <TournamentCardContent showContent={showMyEntries}>
        <div className="p-2 h-full">
          <div className="flex flex-row gap-5 overflow-x-auto pb-2 h-full">
            {ownedGames?.map((game, index) => (
              <EntryCard
                key={index}
                gameAddress={gameAddress}
                game={game}
                tournamentModel={tournamentModel}
              />
            ))}
          </div>
        </div>
      </TournamentCardContent>
    </TournamentCard>
  );
};

export default MyEntries;
