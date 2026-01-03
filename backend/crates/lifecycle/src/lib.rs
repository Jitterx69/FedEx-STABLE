use thiserror::Error;

#[derive(Debug, PartialEq, Clone, Copy)]
pub enum AccountStatus {
    Ingested,
    Assigned,
    Active,
    Escalated,
    Recovered,
    Closed,
}

#[derive(Debug, Error)]
pub enum TransitionError {
    #[error("Invalid transition from {0:?} to {1:?}")]
    Invalid(AccountStatus, AccountStatus),
}

pub struct LifecycleManager;

impl LifecycleManager {
    /// Validates if a transition is legal according to strict STABLE invariants.
    pub fn validate_transition(
        from: AccountStatus,
        to: AccountStatus,
    ) -> Result<(), TransitionError> {
        match (from, to) {
            // Initial path
            (AccountStatus::Ingested, AccountStatus::Assigned) => Ok(()),

            // Active recovery paths
            (AccountStatus::Assigned, AccountStatus::Active) => Ok(()),
            (AccountStatus::Active, AccountStatus::Escalated) => Ok(()),
            (AccountStatus::Active, AccountStatus::Recovered) => Ok(()),

            // Escalation paths
            (AccountStatus::Escalated, AccountStatus::Recovered) => Ok(()),
            (AccountStatus::Escalated, AccountStatus::Closed) => Ok(()),

            // Closure
            (AccountStatus::Recovered, AccountStatus::Closed) => Ok(()),

            // Loopback allowed for re-assignment? (Policy dependent, assume NO for now to be strict)
            _ => Err(TransitionError::Invalid(from, to)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_transitions() {
        assert!(LifecycleManager::validate_transition(
            AccountStatus::Ingested,
            AccountStatus::Assigned
        )
        .is_ok());
        assert!(LifecycleManager::validate_transition(
            AccountStatus::Active,
            AccountStatus::Recovered
        )
        .is_ok());
    }

    #[test]
    fn test_invalid_transitions() {
        // Cannot jump from Ingested to Recovered directly
        assert!(LifecycleManager::validate_transition(
            AccountStatus::Ingested,
            AccountStatus::Recovered
        )
        .is_err());
        // Cannot re-open a Closed account
        assert!(LifecycleManager::validate_transition(
            AccountStatus::Closed,
            AccountStatus::Active
        )
        .is_err());
    }
}
