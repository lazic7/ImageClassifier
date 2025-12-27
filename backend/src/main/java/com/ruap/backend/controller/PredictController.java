package com.ruap.backend.controller;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api")
public class PredictController {

    @PostMapping(value = "/predict", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<String> predict(@RequestPart("image") MultipartFile image) {
        if (image == null || image.isEmpty()) {
            return ResponseEntity.badRequest().body("No image uploaded");
        }

        // TODO: kasnije se ovdje zove Azure ML endpoint
        // Za sad mock:
        String predictedAnimal = "cat";

        return ResponseEntity.ok(predictedAnimal);
    }
}
