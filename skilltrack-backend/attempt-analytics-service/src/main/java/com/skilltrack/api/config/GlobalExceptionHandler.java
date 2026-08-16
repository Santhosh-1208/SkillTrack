package com.skilltrack.api.config;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.time.Instant;
import java.util.Map;
import java.util.NoSuchElementException;
@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String,Object>> handleNotFound(NoSuchElementException e) { return build(HttpStatus.NOT_FOUND, e.getMessage()); }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String,Object>> handleBadRequest(IllegalArgumentException e) { return build(HttpStatus.BAD_REQUEST, e.getMessage()); }
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String,Object>> handleValidation(MethodArgumentNotValidException e) { String msg = e.getBindingResult().getFieldErrors().stream().findFirst().map(err -> err.getField()+" "+err.getDefaultMessage()).orElse("Validation error"); return build(HttpStatus.BAD_REQUEST, msg); }
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String,Object>> handleGeneric(Exception e) { log.error("Unhandled: ",e); return build(HttpStatus.INTERNAL_SERVER_ERROR,"Unexpected error: "+e.getMessage()); }
    private ResponseEntity<Map<String,Object>> build(HttpStatus s, String msg) { return ResponseEntity.status(s).body(Map.of("timestamp",Instant.now().toString(),"status",s.value(),"error",s.getReasonPhrase(),"message",msg)); }
}
