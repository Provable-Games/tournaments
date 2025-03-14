import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ARROW_LEFT } from "@/components/Icons";
import { Form } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, UseFormReturn } from "react-hook-form";
import * as z from "zod";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { CHECK } from "@/components/Icons";
import Details from "@/components/createTournament/Details";
import Schedule from "@/components/createTournament/Schedule";
import EntryRequirements from "@/components/createTournament/EntryRequirements";
import EntryFees from "@/components/createTournament/EntryFees";
import BonusPrizes from "@/components/createTournament/BonusPrizes";
import TournamentConfirmation from "@/components/dialogs/TournamentConfirmation";
import { processPrizes, processTournamentData } from "@/lib/utils/formatting";
import { useAccount } from "@starknet-react/core";
import { useSystemCalls } from "@/dojo/hooks/useSystemCalls";
import {
  useGetMetricsQuery,
  useSubscribeTournamentsQuery,
} from "@/dojo/hooks/useSdkQueries";
import { TOURNAMENT_VERSION_KEY } from "@/lib/constants";
import { addAddressPadding } from "starknet";
import { Tournament } from "@/generated/models.gen";

export type TournamentFormData = z.infer<typeof formSchema>;

export interface StepProps {
  form: UseFormReturn<TournamentFormData>;
  onNext?: () => void;
  onPrev?: () => void;
}

const formSchema = z.object({
  // Schedule step
  startTime: z.date(),
  duration: z.number().min(1).max(7776000), // 90 days
  type: z.enum(["fixed", "open"]),
  submissionPeriod: z.number().min(1).max(324000), // 90 hours

  // Details step
  game: z.string().min(2).max(66),
  settings: z.string(), // Changed to string for ID
  name: z.string().min(2).max(50),
  description: z.string().min(0).max(500),
  leaderboardSize: z.number().min(1).max(1000),

  // Other steps
  enableGating: z.boolean().default(false),
  enableEntryFees: z.boolean().default(false),
  enableBonusPrizes: z.boolean().default(false),
  enableEntryLimit: z.boolean().default(false),
  gatingOptions: z
    .object({
      entry_limit: z.number().min(1).max(100).optional(),
      type: z.enum(["token", "tournament", "addresses"]).optional(),
      token: z.string().optional(),
      tournament: z
        .object({
          tournaments: z.array(z.custom<Tournament>()),
          requirement: z.enum(["participated", "won"]),
        })
        .optional(),
      addresses: z.array(z.string()).default([]),
    })
    .optional(),
  entryFees: z
    .object({
      tokenAddress: z.string().optional(),
      amount: z.number().min(0).optional(),
      value: z.number().min(0).optional(),
      creatorFeePercentage: z.number().min(0).max(100).optional(),
      gameFeePercentage: z.number().min(0).max(100).optional(),
      prizeDistribution: z
        .array(
          z.object({
            position: z.number(),
            percentage: z.number().min(0).max(100),
          })
        )
        .optional(),
    })
    .optional(),
  bonusPrizes: z
    .array(
      z.discriminatedUnion("type", [
        z.object({
          type: z.literal("ERC20"),
          tokenAddress: z.string(),
          amount: z.number().min(0),
          position: z.number().min(1),
        }),
        z.object({
          type: z.literal("ERC721"),
          tokenAddress: z.string(),
          tokenId: z.number().min(1),
          position: z.number().min(1),
        }),
      ])
    )
    .optional(),
});

const CreateTournament = () => {
  const navigate = useNavigate();
  const { address } = useAccount();
  const { createTournamentAndApproveAndAddPrizes } = useSystemCalls();

  useSubscribeTournamentsQuery();
  const { entity: metricsEntity } = useGetMetricsQuery(
    addAddressPadding(TOURNAMENT_VERSION_KEY)
  );

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    shouldUnregister: false,
    defaultValues: {
      // Details step
      game: "",
      settings: "", // Just an ID string now
      name: "",
      description: "",
      leaderboardSize: 10,

      // Schedule step
      startTime: (() => {
        const now = new Date();
        now.setMinutes(Math.ceil(now.getMinutes() / 5) * 5);
        return now;
      })(),
      duration: 86400,
      type: "fixed",
      submissionPeriod: 3600,

      // Other steps
      enableGating: false,
      enableEntryFees: false,
      enableBonusPrizes: false,
      enableEntryLimit: false,
      gatingOptions: {
        entry_limit: 1,
        addresses: [],
        tournament: {
          tournaments: [],
          requirement: "participated",
        },
      },
      entryFees: {
        creatorFeePercentage: 0,
        gameFeePercentage: 0,
      },
      bonusPrizes: [],
    },
  });

  const tournamentCount =
    metricsEntity?.PlatformMetrics?.total_tournaments ?? 0;
  const prizeCount = metricsEntity?.PrizeMetrics?.total_prizes ?? 0;

  // Add state for current step
  const [currentStep, setCurrentStep] = React.useState<
    "details" | "schedule" | "gating" | "fees" | "prizes"
  >("details");

  // Add state to track visited sections
  const [visitedSections, setVisitedSections] = React.useState<Set<string>>(
    new Set(["details"])
  );

  // Add state for confirmation dialog
  const [showConfirmation, setShowConfirmation] = React.useState(false);

  // Helper to determine if we can proceed to next step
  const canProceed = () => {
    const status = getSectionStatus(form);
    switch (currentStep) {
      case "details":
        return status.details.complete;
      case "schedule":
        return status.schedule.complete;
      case "gating":
        return status.gating.complete;
      case "fees":
        return status.fees.complete;
      case "prizes":
        return status.prizes.complete;
    }
  };

  // Modify nextStep to track visited sections
  const nextStep = () => {
    switch (currentStep) {
      case "details":
        setVisitedSections((prev) => new Set([...prev, "schedule"]));
        setCurrentStep("schedule");
        break;
      case "schedule":
        setVisitedSections((prev) => new Set([...prev, "gating"]));
        setCurrentStep("gating");
        break;
      case "gating":
        setVisitedSections((prev) => new Set([...prev, "fees"]));
        setCurrentStep("fees");
        break;
      case "fees":
        setVisitedSections((prev) => new Set([...prev, "prizes"]));
        setCurrentStep("prizes");
        break;
      case "prizes":
        setShowConfirmation(true);
        break;
    }
  };

  // Modify the section click handler to prevent skipping ahead
  const handleSectionClick = (section: string) => {
    const sectionOrder = ["details", "schedule", "gating", "fees", "prizes"];
    const currentIndex = sectionOrder.indexOf(currentStep);
    const clickedIndex = sectionOrder.indexOf(section);

    // Allow clicking only on visited sections or the next unvisited section
    if (visitedSections.has(section) || clickedIndex <= currentIndex + 1) {
      setCurrentStep(section as any);
    }
  };

  // Render the current step's content
  const renderStep = () => (
    <>
      <div
        className={cn(
          "transition-all duration-300 transform",
          currentStep === "details"
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 absolute"
        )}
      >
        <Card
          variant="outline"
          className={`h-auto ${currentStep === "details" ? "block" : "hidden"}`}
        >
          <Details form={form} />
        </Card>
      </div>
      <div
        className={cn(
          "transition-all duration-300 transform",
          currentStep === "schedule"
            ? "translate-x-0 opacity-100"
            : "-translate-x-full opacity-0 absolute"
        )}
      >
        <Card
          variant="outline"
          className={`h-auto ${
            currentStep === "schedule" ? "block" : "hidden"
          }`}
        >
          <Schedule form={form} />
        </Card>
      </div>
      <Card
        variant="outline"
        className={`h-auto ${currentStep === "gating" ? "block" : "hidden"}`}
      >
        <EntryRequirements form={form} />
      </Card>
      <Card
        variant="outline"
        className={`h-auto ${currentStep === "fees" ? "block" : "hidden"}`}
      >
        <EntryFees form={form} />
      </Card>
      <Card
        variant="outline"
        className={`h-auto ${currentStep === "prizes" ? "block" : "hidden"}`}
      >
        <BonusPrizes form={form} />
      </Card>
    </>
  );

  const getSectionStatus = (form: any) => {
    // Helper function to safely check nested values
    const getValue = (path: string) => {
      const value = form.watch(path);
      return value !== undefined && value !== "" ? value : null;
    };

    return {
      details: {
        complete: !!(
          getValue("game") &&
          getValue("settings") &&
          getValue("name") &&
          getValue("description") &&
          getValue("leaderboardSize")
        ),
        enabled: true,
      },
      schedule: {
        complete:
          !!(getValue("startTime") && getValue("duration")) && getValue("type"),
        enabled: true,
      },
      gating: {
        complete:
          getValue("enableGating") === true
            ? (() => {
                const gatingType = getValue("gatingOptions.type");
                if (!gatingType) return false;

                switch (gatingType) {
                  case "token":
                    return !!getValue("gatingOptions.token");
                  case "tournament":
                    return (
                      !!getValue("gatingOptions.tournament.requirement") &&
                      Array.isArray(
                        getValue("gatingOptions.tournament.tournaments")
                      ) &&
                      getValue("gatingOptions.tournament.tournaments").length >
                        0
                    );
                  case "addresses":
                    return (
                      Array.isArray(getValue("gatingOptions.addresses")) &&
                      getValue("gatingOptions.addresses").length > 0
                    );
                  default:
                    return false;
                }
              })()
            : true,
        enabled: getValue("enableGating") === true,
      },
      fees: {
        complete:
          getValue("enableEntryFees") === true
            ? !!(
                getValue("entryFees.tokenAddress") &&
                getValue("entryFees.amount") &&
                getValue("entryFees.amount") > 0
              )
            : true,
        enabled: getValue("enableEntryFees") === true,
      },
      prizes: {
        complete:
          getValue("enableBonusPrizes") === true
            ? !!(
                Array.isArray(getValue("bonusPrizes")) &&
                getValue("bonusPrizes").length > 0
              )
            : true,
        enabled: getValue("enableBonusPrizes") === true,
      },
    };
  };

  // Update the StatusIndicator component
  const StatusIndicator = ({ section }: { section: string }) => {
    const sectionOrder = ["details", "schedule", "gating", "fees", "prizes"];
    const sectionIndex = sectionOrder.indexOf(section);
    const currentIndex = sectionOrder.indexOf(currentStep);

    // Only show check mark if we've moved past this section
    const isCompleted = sectionIndex < currentIndex;

    return (
      <div className="w-5 h-5 text-muted-foreground">
        {isCompleted ? <CHECK /> : <span className="text-xs italic">-</span>}
      </div>
    );
  };

  // Add prevStep function
  const prevStep = () => {
    switch (currentStep) {
      case "schedule":
        setCurrentStep("details");
        break;
      case "gating":
        setCurrentStep("schedule");
        break;
      case "fees":
        setCurrentStep("gating");
        break;
      case "prizes":
        setCurrentStep("fees");
        break;
    }
  };

  const handleCreateTournament = async () => {
    try {
      const formData = form.getValues();
      // Process the tournament data
      const processedTournament = processTournamentData(
        formData,
        address!,
        Number(tournamentCount)
      );
      // Process the prizes if they exist
      const processedPrizes = processPrizes(
        formData,
        Number(tournamentCount),
        Number(prizeCount)
      );
      await createTournamentAndApproveAndAddPrizes(
        processedTournament,
        processedPrizes
      );
      form.reset();
      navigate("/");
    } catch (error) {
      console.error("Error creating tournament:", error);
    }
  };

  return (
    <div className="flex flex-col gap-5 lg:w-[87.5%] xl:w-5/6 2xl:w-3/4 mx-auto">
      <div className="space-y-5">
        <div className="flex flex-row justify-between items-center">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ARROW_LEFT />
            Home
          </Button>

          <div className="flex flex-row gap-2">
            {currentStep !== "details" && (
              <Button variant="outline" onClick={() => prevStep()}>
                <ARROW_LEFT />
                Previous
              </Button>
            )}
            <Button
              type="button"
              disabled={!canProceed()}
              onClick={() => {
                nextStep();
              }}
            >
              {currentStep === "prizes" ? "Create" : "Next"}
            </Button>
            <TournamentConfirmation
              formData={form.getValues()}
              onConfirm={handleCreateTournament}
              open={showConfirmation}
              onOpenChange={setShowConfirmation}
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="font-brand hidden sm:block lg:text-2xl xl:text-3xl 2xl:text-4xl 3xl:text-5xl font-bold">
            Create Tournament
          </span>

          <div className="flex items-center w-full justify-between sm:w-auto sm:gap-6">
            {Object.entries(getSectionStatus(form)).map(
              ([section, _status]) => (
                <div
                  key={section}
                  className={cn(
                    "flex items-center sm:gap-2",
                    visitedSections.has(section) || section === currentStep
                      ? "cursor-pointer"
                      : "cursor-not-allowed opacity-50",
                    currentStep === section && "border-b-2 border-brand"
                  )}
                  onClick={() => handleSectionClick(section)}
                >
                  <StatusIndicator section={section} />
                  <span className="text-xs sm:text-sm capitalize">
                    {section}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <Form {...form}>
        <form className="flex flex-col gap-10 pb-10">{renderStep()}</form>
      </Form>
    </div>
  );
};

export default CreateTournament;
