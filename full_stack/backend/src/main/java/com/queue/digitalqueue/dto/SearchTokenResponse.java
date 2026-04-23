package com.queue.digitalqueue.dto;

import java.util.List;

public record SearchTokenResponse(
        String query,
        List<TokenResponse> matches
) {
}
