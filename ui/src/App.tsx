import MobileFooter from "@/components/MobileFooter";
import { Routes, Route, useParams } from "react-router-dom";
import {
  useGetTokensQuery,
  useGetMetricsQuery,
  useSubscribeMetricsQuery,
  useSubscribeTournamentsQuery,
} from "@/dojo/hooks/useSdkQueries";
import { Toaster } from "@/components/ui/toaster";
import { useEffect, useMemo, useRef, useState, Suspense, lazy } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useDojo } from "@/context/dojo";
import useUIStore from "./hooks/useUIStore";
import { getGames } from "./assets/games";
import Header from "@/components/Header";
import LoadingPage from "@/containers/LoadingPage";
import { useResetDojoOnNetworkChange } from "@/dojo/hooks/useResetDojoOnNetworkChange";
import { useMiniGames } from "metagame-sdk/sql";

const NotFound = lazy(() => import("@/containers/NotFound"));
const Overview = lazy(() => {
  const importPromise = import("@/containers/Overview");
  if (typeof requestIdleCallback === "function") {
    requestIdleCallback(() => {}, { timeout: 500 });
  }
  return importPromise;
});
const Tournament = lazy(() => import("@/containers/Tournament"));
const Play = lazy(() => import("@/containers/Play"));
const RegisterToken = lazy(() => import("@/containers/RegisterToken"));
const CreateTournament = lazy(() => import("@/containers/CreateTournament"));

function App() {
  const { namespace } = useDojo();
  const { setGameData, setGameDataLoading } = useUIStore();

  useResetDojoOnNetworkChange();

  useGetTokensQuery(namespace);
  useGetMetricsQuery(namespace);
  useSubscribeMetricsQuery(namespace);
  useSubscribeTournamentsQuery(namespace);

  const { data: minigames, loading: minigamesLoading } = useMiniGames({});

  const whitelistedGames = getGames();

  // Create a unified array of all games with flags
  const allGames = useMemo(() => {
    if (!minigames) return [];

    // Create maps for faster lookups
    const metadataMap = new Map();
    minigames.forEach((game) => {
      metadataMap.set(game.contract_address, game);
    });

    const whitelistedMap = new Map();
    whitelistedGames.forEach((game) => {
      whitelistedMap.set(game.contract_address, game);
    });

    // Collect all unique contract addresses
    const allAddresses = new Set([
      ...metadataMap.keys(),
      ...whitelistedMap.keys(),
    ]);

    // Create the unified array
    return Array.from(allAddresses).map((address) => {
      const metadata = metadataMap.get(address);
      const whitelisted = whitelistedMap.get(address);

      return {
        ...whitelisted,
        ...metadata,
        image: metadata?.image
          ? metadata?.contract_address ===
            "0x04359aee29873cd9603207d29b4140468bac3e042aa10daab2e1a8b2dd60ef7b"
            ? "https://darkshuffle.io/favicon.svg"
            : metadata?.image
          : whitelisted?.image,
        // Add flags
        isWhitelisted: !!whitelisted,
        existsInMetadata: !!metadata,
      };
    });
  }, [minigames, whitelistedGames]);

  // Store the stringified version of allGames to detect actual changes
  const allGamesStringified = useMemo(() => {
    try {
      return JSON.stringify(allGames);
    } catch (e) {
      return "";
    }
  }, [allGames]);

  // Store the previous stringified version to compare
  const prevAllGamesStringifiedRef = useRef("");

  // Use a separate effect for loading state
  useEffect(() => {
    setGameDataLoading(minigamesLoading);
  }, [minigamesLoading, setGameDataLoading]);

  // Use a separate effect for setting game data
  useEffect(() => {
    // Only update if allGames has changed (by comparing stringified versions)
    if (
      allGames.length > 0 &&
      allGamesStringified !== prevAllGamesStringifiedRef.current
    ) {
      prevAllGamesStringifiedRef.current = allGamesStringified;
      setGameData(allGames);
    }
  }, [allGamesStringified, allGames, setGameData]);

  return (
    <TooltipProvider>
      <div className="flex flex-col min-h-screen h-screen overflow-hidden">
        <Header />
        <main className="flex-1 px-4 pt-4 xl:px-10 xl:pt-10 2xl:px-20 2xl:pt-20 overflow-hidden">
          <Routes>
            <Route
              path="/"
              element={
                <Suspense
                  fallback={<LoadingPage message={`Loading overview...`} />}
                >
                  <Overview />
                </Suspense>
              }
            />
            <Route path="/tournament">
              <Route
                path=":id"
                element={
                  <ErrorBoundary
                    fallback={
                      <Suspense>
                        <NotFound message="Something went wrong rendering the tournament" />
                      </Suspense>
                    }
                  >
                    <TournamentWrapper />
                  </ErrorBoundary>
                }
              />
            </Route>
            <Route
              path="/create-tournament"
              element={
                <Suspense
                  fallback={
                    <LoadingPage message={`Loading create tournament...`} />
                  }
                >
                  <CreateTournament />
                </Suspense>
              }
            />
            <Route
              path="/register-token"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <RegisterToken />
                </Suspense>
              }
            />
            <Route
              path="/play"
              element={
                <Suspense fallback={<div>Loading...</div>}>
                  <Play />
                </Suspense>
              }
            />
            <Route
              path="*"
              element={
                <Suspense>
                  <NotFound />
                </Suspense>
              }
            />
          </Routes>
        </main>
        <MobileFooter />
        <Toaster />
      </div>
    </TooltipProvider>
  );
}

function TournamentWrapper() {
  const { id } = useParams();
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    try {
      if (id) BigInt(id);
    } catch (error) {
      setHasError(true);
      setErrorMessage(`Invalid tournament ID format: ${id}`);
    }
  }, [id]);

  if (hasError) {
    return (
      <Suspense fallback={<LoadingPage message={`Loading error page...`} />}>
        <NotFound message={errorMessage} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<LoadingPage message={`Loading tournament...`} />}>
      <Tournament />
    </Suspense>
  );
}
export default App;
