package app.nwm.server.tts;

import app.nwm.server.security.SecurityUser;
import app.nwm.server.tts.dto.JobResponse;
import app.nwm.server.tts.dto.SynthesizeRequest;
import jakarta.validation.Valid;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/tts")
@PreAuthorize("isAuthenticated()")
public class TtsController {

  private static final int MAX_PAGE_SIZE = 50;

  private final TtsJobService ttsJobService;

  public TtsController(TtsJobService ttsJobService) {
    this.ttsJobService = ttsJobService;
  }

  @PostMapping("/synthesize")
  public ResponseEntity<JobResponse> synthesize(
      @AuthenticationPrincipal SecurityUser principal, @Valid @RequestBody SynthesizeRequest request) {
    JobResponse job = ttsJobService.synthesize(principal.getId(), request);
    return ResponseEntity.status(HttpStatus.ACCEPTED).body(job);
  }

  @GetMapping("/jobs/{id}")
  public JobResponse getJob(@AuthenticationPrincipal SecurityUser principal, @PathVariable UUID id) {
    return ttsJobService.getJob(principal.getId(), id);
  }

  /** Server-Sent Events stream of a job's chunks as they're synthesized, ending with a "done" event. */
  @GetMapping(path = "/jobs/{id}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter streamJob(@AuthenticationPrincipal SecurityUser principal, @PathVariable UUID id) {
    return ttsJobService.streamJob(principal.getId(), id);
  }

  @GetMapping("/history")
  public Page<JobResponse> history(
      @AuthenticationPrincipal SecurityUser principal,
      @PageableDefault(size = 20) Pageable pageable) {
    int cappedSize = Math.min(pageable.getPageSize(), MAX_PAGE_SIZE);
    Pageable safePageable = PageRequest.of(pageable.getPageNumber(), cappedSize, pageable.getSort());
    return ttsJobService.listHistory(principal.getId(), safePageable);
  }
}
