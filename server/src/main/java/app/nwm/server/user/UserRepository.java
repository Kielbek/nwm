package app.nwm.server.user;

import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, UUID> {
  Optional<User> findByEmail(String email);

  boolean existsByEmail(String email);

  Optional<User> findByStripeCustomerId(String stripeCustomerId);

  Optional<User> findByStripeSubscriptionId(String stripeSubscriptionId);

  Page<User> findByEmailContainingIgnoreCase(String email, Pageable pageable);
}
