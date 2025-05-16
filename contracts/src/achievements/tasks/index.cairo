// External imports

use achievement::types::task::{Task as BushidoTask, TaskTrait as BushidoTaskTrait};

// Internal imports

use tournaments::achievements::tasks;

// Types

#[derive(Copy, Drop)]
pub enum Task {
    None,
    Create,
    Entries,
    Exclusive,
    PassHolder,
    Prizes,
    Qualification,
    TopFinish,
}

// Implementations

#[generate_trait]
pub impl TaskImpl of TaskTrait {
    #[inline]
    fn identifier(self: Task) -> felt252 {
        match self {
            Task::None => 0,
            Task::Create => tasks::Create::Create::identifier(),
            Task::Entries => tasks::Entries::Entries::identifier(),
            Task::Exclusive => tasks::Exclusive::Exclusive::identifier(),
            Task::PassHolder => tasks::PassHolder::PassHolder::identifier(),
            Task::Prizes => tasks::Prizes::Prizes::identifier(),
            Task::Qualification => tasks::Qualification::Qualification::identifier(),
            Task::TopFinish => tasks::TopFinish::TopFinish::identifier(),
        }
    }

    #[inline]
    fn description(self: Task, count: u32) -> ByteArray {
        match self {
            Task::None => "",
            Task::Create => tasks::Create::Create::description(count),
            Task::Entries => tasks::Entries::Entries::description(count),
            Task::Exclusive => tasks::Exclusive::Exclusive::description(count),
            Task::PassHolder => tasks::PassHolder::PassHolder::description(count),
            Task::Prizes => tasks::Prizes::Prizes::description(count),
            Task::Qualification => tasks::Qualification::Qualification::description(count),
            Task::TopFinish => tasks::TopFinish::TopFinish::description(count),
        }
    }

    #[inline]
    fn tasks(self: Task, count: u32) -> Span<BushidoTask> {
        let task_id: felt252 = self.identifier();
        let description: ByteArray = self.description(count);
        array![BushidoTaskTrait::new(task_id, count, description)].span()
    }
}

pub impl IntoTaskU8 of Into<Task, u8> {
    #[inline]
    fn into(self: Task) -> u8 {
        match self {
            Task::None => 0,
            Task::Create => 1,
            Task::Entries => 2,
            Task::Exclusive => 3,
            Task::PassHolder => 4,
            Task::Prizes => 5,
            Task::Qualification => 6,
            Task::TopFinish => 7,
        }
    }
}

pub impl IntoU8Task of Into<u8, Task> {
    #[inline]
    fn into(self: u8) -> Task {
        let card: felt252 = self.into();
        match card {
            0 => Task::None,
            1 => Task::Create,
            2 => Task::Entries,
            3 => Task::Exclusive,
            4 => Task::PassHolder,
            5 => Task::Prizes,
            6 => Task::Qualification,
            7 => Task::TopFinish,
            _ => Task::None,
        }
    }
}