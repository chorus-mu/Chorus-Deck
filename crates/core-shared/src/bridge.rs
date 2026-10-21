use std::sync::Arc;
use parking_lot::RwLock;
use tokio::sync::{broadcast, watch};
use crate::audio::{Cue, PlaybackClock, Spares};
use crate::state::{CanvasAction, CanvasState};

#[derive(Clone)]
pub struct RuntimeBridge {
    pub state: Arc<RwLock<CanvasState>>,
    pub state_tx: watch::Sender<CanvasState>,
    pub state_rx: watch::Receiver<CanvasState>,
    pub action_tx: broadcast::Sender<CanvasAction>,
    pub clock: PlaybackClock,
    pub spares: Spares,
}

impl RuntimeBridge {
    pub fn new() -> Self {
        let initial_state = CanvasState::default();
        let (state_tx, state_rx) = watch::channel(initial_state.clone());
        let (action_tx, _) = broadcast::channel(128);
        let cue = Cue::new();
        let clock = PlaybackClock::new(cue);
        let spares = Spares::new();

        Self {
            state: Arc::new(RwLock::new(initial_state)),
            state_tx,
            state_rx,
            action_tx,
            clock,
            spares,
        }
    }

    pub fn get_state(&self) -> CanvasState {
        self.state.read().clone()
    }

    pub fn update_state<F>(&self, update_fn: F)
    where
        F: FnOnce(&mut CanvasState),
    {
        let mut guard = self.state.write();
        update_fn(&mut guard);
        let _ = self.state_tx.send(guard.clone());
    }

    pub fn send_action(&self, action: CanvasAction) -> Result<usize, broadcast::error::SendError<CanvasAction>> {
        self.action_tx.send(action)
    }

    pub fn subscribe_actions(&self) -> broadcast::Receiver<CanvasAction> {
        self.action_tx.subscribe()
    }
}

impl Default for RuntimeBridge {
    fn default() -> Self {
        Self::new()
    }
}
