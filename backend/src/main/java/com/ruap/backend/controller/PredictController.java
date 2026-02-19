package com.ruap.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.beans.factory.annotation.Value;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class PredictController {

    private final RestClient restClient = RestClient.create();

    @Value("${azure.url:}")
    private String azureUrl;

    @Value("${bearer.token:}")
    private String bearerToken;

    public PredictController() {}

    @PostMapping(value = "/predict", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> predict(@RequestPart("images") MultipartFile[] images) {
        if (images == null || images.length == 0) {
            return ResponseEntity.badRequest().body("No images uploaded");
        }

        try {
            String responseBody = callAzureMlBatch(images);
            return ResponseEntity.ok(responseBody);
        } catch (IOException e) {
            return ResponseEntity.internalServerError().body("Invalid Azure ML response");
        }
    }

    private String callAzureMlBatch(MultipartFile[] images) throws IOException {
        if (azureUrl.isBlank()) {
            return "{\"ok\":true,\"predictions\":[],\"errors\":[]}";
        }

        List<Map<String, Object>> items = new ArrayList<>(images.length);
        for (int i = 0; i < images.length; i++) {
            Map<String, Object> item = new HashMap<>();
            item.put("id", String.valueOf(i));
            item.put("image_base64", Base64.getEncoder().encodeToString(images[i].getBytes()));
            items.add(item);
        }

        Map<String, Object> payload = new HashMap<>();
        payload.put("return_topk", 3);
        payload.put("images", items);

        return restClient.post()
                .uri(azureUrl)
                .contentType(MediaType.APPLICATION_JSON)
                .header("Authorization", "Bearer " + bearerToken)
                .body(payload)
                .retrieve()
                .body(String.class);
    }
}
