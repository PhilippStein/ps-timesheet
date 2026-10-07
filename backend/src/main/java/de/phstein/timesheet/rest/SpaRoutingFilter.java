package de.phstein.timesheet.rest;

import io.vertx.core.Handler;
import io.vertx.ext.web.Router;
import io.vertx.ext.web.RoutingContext;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;

@ApplicationScoped
public class SpaRoutingFilter {

    public void init(@Observes Router router) {
        router.get("/*").handler(new Handler<RoutingContext>() {
            @Override
            public void handle(RoutingContext rc) {
                String path = rc.normalizedPath();
                if (!path.startsWith("/api") && !path.startsWith("/q") && !path.contains(".")) {
                    rc.reroute("/index.html");
                } else {
                    rc.next();
                }
            }
        });
    }
}
