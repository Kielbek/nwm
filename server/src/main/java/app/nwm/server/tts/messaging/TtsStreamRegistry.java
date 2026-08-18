package app.nwm.server.tts.messaging;

import app.nwm.server.tts.dto.JobResponse;
import app.nwm.server.tts.dto.JobResponse.ChunkResponse;
import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Holds the SSE connections currently listening for a job's progress, so
 * {@code TtsChunkConsumer}/{@code TtsResultConsumer} (running on the
 * RabbitMQ listener thread) can push events into whatever HTTP request
 * thread is holding the browser's EventSource connection for that job.
 *
 * A job can have zero listeners (the browser tab was closed, or the
 * request just hasn't been made yet) — chunks still get persisted either
 * way, so a late subscriber can always catch up from the database instead
 * of missing audio.
 */
@Component
public class TtsStreamRegistry {

  private static final Logger log = LoggerFactory.getLogger(TtsStreamRegistry.class);

  private static final class Listener {
    final SseEmitter emitter;
    final Set<Integer> sentChunkIndexes = ConcurrentHashMap.newKeySet();

    Listener(SseEmitter emitter) {
      this.emitter = emitter;
    }
  }

  private final Map<UUID, List<Listener>> listenersByJob = new ConcurrentHashMap<>();

  public SseEmitter register(UUID jobId) {
    // No timeout: a long CPU-bound synthesis can legitimately take minutes,
    // and the connection is otherwise idle between chunk events. The
    // "done" event always arrives eventually (TtsResultConsumer publishes
    // it on both success and failure), which completes and removes it.
    SseEmitter emitter = new SseEmitter(0L);
    Listener listener = new Listener(emitter);
    listenersByJob.computeIfAbsent(jobId, key -> new CopyOnWriteArrayList<>()).add(listener);

    Runnable cleanup = () -> removeListener(jobId, listener);
    emitter.onCompletion(cleanup);
    emitter.onTimeout(cleanup);
    emitter.onError(ex -> cleanup.run());
    return emitter;
  }

  /** Sends a chunk that was already persisted before this listener registered (catch-up on connect). */
  public void replayChunk(UUID jobId, SseEmitter emitter, ChunkResponse chunk) {
    findListener(jobId, emitter).ifPresent(listener -> sendChunkOnce(listener, chunk));
  }

  /** Called by TtsChunkConsumer as each new chunk is persisted — fans out to every live listener. */
  public void emitChunk(UUID jobId, ChunkResponse chunk) {
    for (Listener listener : listenersByJob.getOrDefault(jobId, List.of())) {
      sendChunkOnce(listener, chunk);
    }
  }

  /** Called by TtsResultConsumer once the job reaches a terminal status — ends every live listener. */
  public void completeAll(UUID jobId, JobResponse finalJob) {
    List<Listener> listeners = listenersByJob.remove(jobId);
    if (listeners == null) {
      return;
    }
    for (Listener listener : listeners) {
      sendDone(listener.emitter, finalJob);
    }
  }

  /** Used when a listener subscribes to a job that had already finished before it connected. */
  public void completeImmediately(UUID jobId, SseEmitter emitter, JobResponse finalJob) {
    findListener(jobId, emitter).ifPresent(listener -> removeListener(jobId, listener));
    sendDone(emitter, finalJob);
  }

  private void sendChunkOnce(Listener listener, ChunkResponse chunk) {
    if (!listener.sentChunkIndexes.add(chunk.index())) {
      return;
    }
    try {
      listener.emitter.send(SseEmitter.event().name("chunk").data(chunk));
    } catch (IOException | IllegalStateException e) {
      log.debug("Dropping SSE listener after failed chunk send: {}", e.getMessage());
      listener.emitter.completeWithError(e);
    }
  }

  private void sendDone(SseEmitter emitter, JobResponse finalJob) {
    try {
      emitter.send(SseEmitter.event().name("done").data(finalJob));
      emitter.complete();
    } catch (IOException | IllegalStateException e) {
      log.debug("Dropping SSE listener after failed done send: {}", e.getMessage());
      emitter.completeWithError(e);
    }
  }

  private java.util.Optional<Listener> findListener(UUID jobId, SseEmitter emitter) {
    return listenersByJob.getOrDefault(jobId, List.of()).stream()
        .filter(listener -> listener.emitter == emitter)
        .findFirst();
  }

  private void removeListener(UUID jobId, Listener listener) {
    List<Listener> listeners = listenersByJob.get(jobId);
    if (listeners == null) {
      return;
    }
    listeners.remove(listener);
    if (listeners.isEmpty()) {
      listenersByJob.remove(jobId, listeners);
    }
  }
}
