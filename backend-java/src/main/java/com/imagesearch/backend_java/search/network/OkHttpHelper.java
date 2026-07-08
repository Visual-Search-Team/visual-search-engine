package com.imagesearch.backend_java.search.network;


import com.google.gson.Gson;
import lombok.extern.slf4j.Slf4j;
import okhttp3.*;
import org.apache.commons.lang3.RandomStringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.lang.reflect.Type;
import java.util.Map;

@Component
@Slf4j(topic = "OKHTTP-HELPER")
public class OkHttpHelper {

    @Autowired
    OkHttpClient okHttpClient;

    @Autowired
    Gson gson;

    public <T> T httpGet(String url, Map<String, String> headers, Map<String, String> queries,
                         Type valueType, Integer streamNum,String orderCode) throws IOException {
        HttpUrl.Builder urlBuilder = HttpUrl.parse(url).newBuilder();
        if (queries != null && !queries.isEmpty()) {
            for (Map.Entry<String, String> entry : queries.entrySet()) {
                urlBuilder.addQueryParameter(entry.getKey(), entry.getValue());
            }
        }
        url = urlBuilder.build().toString();


        Request.Builder requestBuilder = new Request.Builder().url(url);
        if (headers != null && !headers.isEmpty()) {
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                requestBuilder.addHeader(entry.getKey(), entry.getValue());
            }
        }
        Request request = requestBuilder.build();
        Call call = okHttpClient.newCall(request);
        try (Response response = call.execute()) {
            String raw = response.body().string();

            return gson.fromJson(raw, valueType);
        } catch (IOException e) {
            // build message to send
            log.error("Error in call api with url:{} and queris {} - message {}",url, queries,e.getMessage());
            throw e;
        }
    }

    public <T, Y> T httpPost(String url, Map<String, String> headers, Y requestBody, Type valueType, Integer streamNum, String orderCode)
            throws IOException {
        MediaType jsonType = MediaType.parse("application/json; charset=utf-8");
        String json = gson.toJson(requestBody);

        RequestBody body = RequestBody.create(json, jsonType);
        Request.Builder requestBuilder = new Request.Builder().url(url).post(body);
        if (headers != null && !headers.isEmpty()) {
            for (Map.Entry<String, String> entry : headers.entrySet()) {
                requestBuilder.addHeader(entry.getKey(), entry.getValue());
            }
        }
        Request request = requestBuilder.build();
        Call call = okHttpClient.newCall(request);
        try (Response response = call.execute()) {
            String raw = response.body().string();

            return gson.fromJson(raw, valueType);
        } catch (IOException e) {
            log.error("Error in call api with url:{} and body{} - message {}",url,body,e.getMessage());
            throw e;
        }
    }
}