package com.example.rusreact2.controllers.advice;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.PropertySource;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ModelAttribute;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Mono;

@Slf4j
@ControllerAdvice
@RequiredArgsConstructor
@PropertySource("classpath:application.properties")
public class AdviceController {

    @Value("${app.cdn}")
    private String cdn;

    @ModelAttribute(name = "cdn")
    public Mono<String> cdnUrl() {
        log.info("CDN" + cdn);
        return Mono.just(cdn);
    }

//    @ModelAttribute(name = "auth")
//    public Mono<Boolean> isAuthenticate(@AuthenticationPrincipal AppUser user){
//        if(user != null){
//            return Mono.just(true);
//        }else{
//            return Mono.just(false);
//        }
//    }

//    @ModelAttribute(name = "user")
//    public Mono<AppUser> user(@AuthenticationPrincipal AppUser user){
//        log.info("isAuthenticate user: {}", user);
//        if(user != null){
//            return userService.getUserByUuid(user.getUuid()).flatMap(founded -> {
//                return personalDataService.findByUserUuid(founded.getUuid()).flatMap(personalData -> {
//                    founded.setPersonalData(personalData);
//                    log.info("isAuthenticate user is not null");
//                    return Mono.just(founded);
//                });
//            });
//        }else{
//            log.info("isAuthenticate user is null");
//            return Mono.empty();
//        }
//    }

//    @ModelAttribute(name = "applicationsType")
//    public Flux<EnumStruct<ApplicationType>> applicationsType(){
//        return ApplicationType.getApplicationType();
//    }
//
//    @ModelAttribute(name = "TTOList")
//    public Flux<EnumStruct<TerritorialOrganization>> territorialOrganization(){
//        return TerritorialOrganization.getOrganizations();
//    }
//
//    @ModelAttribute(name = "siteKey")
//    public Mono<String> getSiteKey(){
//        return Mono.just(siteKey);
//    }
//
//    @ModelAttribute(name = "blockTypes")
//    public Flux<EnumStruct<BlockType>> blockTypes(){
//        return BlockType.getBlockTypes();
//    }
}
