package com.imagesearch.backend_java.utils;

import java.time.LocalDate;
import java.util.Map;

public class MapUtil {
    public static <T> T convertMap(Map<String, Object> params, String key, Class<T> tClass){
        Object obj = params.get(key);
        if(obj == null) return null;
        String value = obj.toString().trim();
        if(value.isEmpty()) return null;
        try{
            if(tClass == Long.class) return tClass.cast(Long.parseLong(value));
            if(tClass == Integer.class) return tClass.cast(Integer.parseInt(value));
            if(tClass == String.class) return tClass.cast(value);
            if(tClass == Boolean.class) return tClass.cast(Boolean.parseBoolean(value));
            if(tClass.isEnum()) return tClass.cast(Enum.valueOf((Class<Enum>) tClass, value));
            if(tClass == LocalDate.class) return tClass.cast(LocalDate.parse(value));
            return tClass.cast(value);
        } catch(Exception ex){
            return null;
        }
    }
}
