package app.nwm.server;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("test")
class NwmServerApplicationTests {

  @Test
  void contextLoads() {
    // If the Spring context fails to wire (bad bean config, missing
    // property, broken security filter chain, ...) this test fails.
  }
}
