package app.nwm.server.user;

/** Mirrors the subset of Stripe subscription statuses this app actually reacts to. */
public enum SubscriptionStatus {
  NONE,
  ACTIVE,
  PAST_DUE,
  CANCELED,
  INCOMPLETE
}
