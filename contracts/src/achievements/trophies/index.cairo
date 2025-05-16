use achievement::types::task::{Task as BushidoTask};
use tournaments::achievements::trophies;

pub const TROPHY_COUNT: u8 = 11;

// Types

#[derive(Copy, Drop)]
pub enum Trophy {
    None,
    Trailblazer,
    EventArchitect,
    Mastermind,
    FirstSteps,
    SeasonedCompetitor,
    Veteran,
    Vip,
    PassHolder,
    Donator,
    Qualified,
    OnThePodium,
}

// Implementations

#[generate_trait]
pub impl TrophyImpl of TrophyTrait {
    #[inline]
    fn identifier(self: Trophy) -> felt252 {
        match self {
            Trophy::None => 0,
            Trophy::Trailblazer => trophies::Create::Create::identifier(0),
            Trophy::EventArchitect => trophies::Create::Create::identifier(1),
            Trophy::Mastermind => trophies::Create::Create::identifier(2),
            Trophy::FirstSteps => trophies::Entries::Entries::identifier(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::identifier(1),
            Trophy::Veteran => trophies::Entries::Entries::identifier(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::identifier(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::identifier(0),
            Trophy::Donator => trophies::Prizes::Prizes::identifier(0),
            Trophy::Qualified => trophies::Qualification::Qualification::identifier(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::identifier(0),
        }
    }

    #[inline]
    fn hidden(self: Trophy) -> bool {
        match self {
            Trophy::None => true,
            Trophy::Trailblazer => trophies::Create::Create::hidden(0),
            Trophy::EventArchitect => trophies::Create::Create::hidden(1),
            Trophy::Mastermind => trophies::Create::Create::hidden(2),
            Trophy::FirstSteps => trophies::Entries::Entries::hidden(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::hidden(1),
            Trophy::Veteran => trophies::Entries::Entries::hidden(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::hidden(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::hidden(0),
            Trophy::Donator => trophies::Prizes::Prizes::hidden(0),
            Trophy::Qualified => trophies::Qualification::Qualification::hidden(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::hidden(0),
        }
    }


    #[inline]
    fn index(self: Trophy) -> u8 {
        match self {
            Trophy::None => 0,
            Trophy::Trailblazer => trophies::Create::Create::index(0),
            Trophy::EventArchitect => trophies::Create::Create::index(1),
            Trophy::Mastermind => trophies::Create::Create::index(2),
            Trophy::FirstSteps => trophies::Entries::Entries::index(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::index(1),
            Trophy::Veteran => trophies::Entries::Entries::index(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::index(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::index(0),
            Trophy::Donator => trophies::Prizes::Prizes::index(0),
            Trophy::Qualified => trophies::Qualification::Qualification::index(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::index(0),
        }
    }

    #[inline]
    fn points(self: Trophy) -> u16 {
        match self {
            Trophy::None => 0,
            Trophy::Trailblazer => trophies::Create::Create::points(0),
            Trophy::EventArchitect => trophies::Create::Create::points(1),
            Trophy::Mastermind => trophies::Create::Create::points(2),
            Trophy::FirstSteps => trophies::Entries::Entries::points(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::points(1),
            Trophy::Veteran => trophies::Entries::Entries::points(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::points(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::points(0),
            Trophy::Donator => trophies::Prizes::Prizes::points(0),
            Trophy::Qualified => trophies::Qualification::Qualification::points(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::points(0),
        }
    }

    #[inline]
    fn start(self: Trophy) -> u64 {
        // TODO: Update start time if you want to create ephemeral trophies
        0
    }

    #[inline]
    fn end(self: Trophy) -> u64 {
        // TODO: Update end time if you want to create ephemeral trophies
        // Note: End time must be greater than start time
        0
    }

    #[inline]
    fn group(self: Trophy) -> felt252 {
        match self {
            Trophy::None => 0,
            Trophy::Trailblazer => trophies::Create::Create::group(),
            Trophy::EventArchitect => trophies::Create::Create::group(),
            Trophy::Mastermind => trophies::Create::Create::group(),
            Trophy::FirstSteps => trophies::Entries::Entries::group(),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::group(),
            Trophy::Veteran => trophies::Entries::Entries::group(),
            Trophy::Vip => trophies::Exclusive::Exclusive::group(),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::group(),
            Trophy::Donator => trophies::Prizes::Prizes::group(),
            Trophy::Qualified => trophies::Qualification::Qualification::group(),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::group(),
        }
    }

    #[inline]
    fn icon(self: Trophy) -> felt252 {
        match self {
            Trophy::None => 0,
            Trophy::Trailblazer => trophies::Create::Create::icon(0),
            Trophy::EventArchitect => trophies::Create::Create::icon(1),
            Trophy::Mastermind => trophies::Create::Create::icon(2),
            Trophy::FirstSteps => trophies::Entries::Entries::icon(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::icon(1),
            Trophy::Veteran => trophies::Entries::Entries::icon(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::icon(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::icon(0),
            Trophy::Donator => trophies::Prizes::Prizes::icon(0),
            Trophy::Qualified => trophies::Qualification::Qualification::icon(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::icon(0),
        }
    }

    #[inline]
    fn title(self: Trophy) -> felt252 {
        match self {
            Trophy::None => 0,
            Trophy::Trailblazer => trophies::Create::Create::title(0),
            Trophy::EventArchitect => trophies::Create::Create::title(1),
            Trophy::Mastermind => trophies::Create::Create::title(2),
            Trophy::FirstSteps => trophies::Entries::Entries::title(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::title(1),
            Trophy::Veteran => trophies::Entries::Entries::title(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::title(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::title(0),
            Trophy::Donator => trophies::Prizes::Prizes::title(0),
            Trophy::Qualified => trophies::Qualification::Qualification::title(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::title(0),
        }
    }


    #[inline]
    fn description(self: Trophy) -> ByteArray {
        match self {
            Trophy::None => "",
            Trophy::Trailblazer => trophies::Create::Create::description(0),
            Trophy::EventArchitect => trophies::Create::Create::description(1),
            Trophy::Mastermind => trophies::Create::Create::description(2),
            Trophy::FirstSteps => trophies::Entries::Entries::description(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::description(1),
            Trophy::Veteran => trophies::Entries::Entries::description(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::description(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::description(0),
            Trophy::Donator => trophies::Prizes::Prizes::description(0),
            Trophy::Qualified => trophies::Qualification::Qualification::description(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::description(0),
        }
    }

    #[inline]
    fn tasks(self: Trophy) -> Span<BushidoTask> {
        match self {
            Trophy::None => [].span(),
            Trophy::Trailblazer => trophies::Create::Create::tasks(0),
            Trophy::EventArchitect => trophies::Create::Create::tasks(1),
            Trophy::Mastermind => trophies::Create::Create::tasks(2),
            Trophy::FirstSteps => trophies::Entries::Entries::tasks(0),
            Trophy::SeasonedCompetitor => trophies::Entries::Entries::tasks(1),
            Trophy::Veteran => trophies::Entries::Entries::tasks(2),
            Trophy::Vip => trophies::Exclusive::Exclusive::tasks(0),
            Trophy::PassHolder => trophies::PassHolder::PassHolder::tasks(0),
            Trophy::Donator => trophies::Prizes::Prizes::tasks(0),
            Trophy::Qualified => trophies::Qualification::Qualification::tasks(0),
            Trophy::OnThePodium => trophies::TopFinish::TopFinish::tasks(0),
        }
    }

    #[inline]
    fn data(self: Trophy) -> ByteArray {
        ""
    }
}

pub impl IntoTrophyU8 of Into<Trophy, u8> {
    #[inline]
    fn into(self: Trophy) -> u8 {
        match self {
            Trophy::None => 0,
            Trophy::Trailblazer => 1,
            Trophy::EventArchitect => 2,
            Trophy::Mastermind => 3,
            Trophy::FirstSteps => 4,
            Trophy::SeasonedCompetitor => 5,
            Trophy::Veteran => 6,
            Trophy::Vip => 7,
            Trophy::PassHolder => 8,
            Trophy::Donator => 9,
            Trophy::Qualified => 10,
            Trophy::OnThePodium => 11,
        }
    }
}

pub impl IntoU8Trophy of Into<u8, Trophy> {
    #[inline]
    fn into(self: u8) -> Trophy {
        let card: felt252 = self.into();
        match card {
            0 => Trophy::None,
            1 => Trophy::Trailblazer,
            2 => Trophy::EventArchitect,
            3 => Trophy::Mastermind,
            4 => Trophy::FirstSteps,
            5 => Trophy::SeasonedCompetitor,
            6 => Trophy::Veteran,
            7 => Trophy::Vip,
            8 => Trophy::PassHolder,
            9 => Trophy::Donator,
            10 => Trophy::Qualified,
            11 => Trophy::OnThePodium,
            _ => Trophy::None,
        }
    }
}