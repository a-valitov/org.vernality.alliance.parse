Parse.Cloud.define('hello', function(req, res) {
    return 'Hi';
});

async function isAdmin(user) {
    // find all roles of our user
    const roles = await new Parse.Query(Parse.Role).equalTo('users', user).find({useMasterKey: true});

    let userIsAdmin = false;
    for (let role of roles) {
        if (role.get("name") == "administrator") {
            userIsAdmin = true;
            break;
        }
    }
    return userIsAdmin;
}

//sends PN to a single user with certain message
function sendPushTo(user, title, body, name) {
    const query = new Parse.Query(Parse.Installation);
    query.equalTo('user', user);

    Parse.Push.send({
        where: query,
        data: {
            alert: {
                "title": title,
                "body": body,
            },
            sound: "space.caf",
            name: name,
        }
    }, {useMasterKey: true})
        .then(function () {
            console.log("successful push");
        }, function (error) {
            console.log(error);
        });
}

//sends PNs to all users except current one with certain message
function sendPushToAllExcept(user, title, body, name) {
    var queryUsers = new Parse.Query(Parse.Installation);
    queryUsers.notEqualTo('user', user);

    Parse.Push.send({
        where: queryUsers,
        data: {
            alert: {
                "title": title,
                "body": body,
            },
            sound: "space.caf",
            name: name,
        }
    }, {useMasterKey: true})
        .then(function () {
            console.log("successful push");
        }, function (error) {
            console.log(error);
        });
}

function sendPushToAdmins(name, title, body= "", type = "", identifier = "") {
    var query = new Parse.Query(Parse.Role);
    query.equalTo("name", "administrator");
    query.first({useMasterKey: true}).then((role) => {
        var relation = role.getUsers();
        relation.query().find({useMasterKey: true}).then((users) => {
            var query = new Parse.Query(Parse.Installation);
            query.containedIn('user', users);
            Parse.Push.send({
                where: query,
                data: {
                    alert: {
                        "title" : title,
                        "body" : body,
                    },
                    name: name,
                    sound: "space.caf",
                    type: type,
                    identifier: identifier
                }
            }, {useMasterKey: true})
                .then(function () {
                    console.log("successful push");
                }, function (error) {
                    console.log(error);
                });
        }).catch(function (error) {
            console.log(error);
        });
    }).catch(function (error) {
        console.error(error);
    });
}

async function getActionById(actionId) {
    const Action = Parse.Object.extend("Action");
    const actionQuery = new Parse.Query(Action);
    actionQuery.include("supplier");
    actionQuery.include("user");
    const action = await actionQuery.get(actionId, {useMasterKey: true});
    return action;
}


Parse.Cloud.define("approveAction", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of commercial offer in database
    const action = await getActionById(request.params.actionId);
    action.set("statusString", "approved");
    action.save(null, { useMasterKey: true });

    // sending PNs
    const actionOwnerRelation = action.get("user", {useMasterKey: true});
    const actionOwner = await actionOwnerRelation.query().first({useMasterKey: true});
    sendPushTo(actionOwner, "Вашу акцию одобрили!",
        action.get("message"), "Оповещение об одобрении акции");

    const actionOwnerName = action.get("supplier").get("name");
    sendPushToAllExcept(actionOwner, "Появилась новая акция от " + actionOwnerName,
        action.get("message"), "Оповещение о новой акции");
});

Parse.Cloud.define("rejectAction", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of commercial offer in database
    const action = await getActionById(request.params.actionId);
    action.set("statusString", "rejected");
    action.save(null, { useMasterKey: true });

    // sending PNs
    const actionOwnerRelation = action.get("user", {useMasterKey: true});
    const actionOwner = await actionOwnerRelation.query().first({useMasterKey: true});
    sendPushTo(actionOwner, "Ваша акция не одобрена",
        action.get("message"), "Оповещение об отказе в акции");
});


async function getCommercialOfferById(commercialOfferId) {
    const CommercialOffer = Parse.Object.extend("CommercialOffer");
    const commercialOfferQuery = new Parse.Query(CommercialOffer);
    commercialOfferQuery.include("supplier");
    commercialOfferQuery.include("user");
    const commercialOffer = await commercialOfferQuery.get(commercialOfferId, {useMasterKey: true});
    return commercialOffer;
}

Parse.Cloud.define("approveCommercialOffer", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of commercial offer in database
    const commercialOffer = await getCommercialOfferById(request.params.commercialOfferId);
    commercialOffer.set("statusString", "approved");
    commercialOffer.save(null, { useMasterKey: true });

    // sending PNs
    const commercialOfferOwnerRelation = commercialOffer.get("user", {useMasterKey: true});
    const commercialOfferOwner = await commercialOfferOwnerRelation.query().first({useMasterKey: true});
    sendPushTo(commercialOfferOwner, "Ваше коммерческое предложение одобрили!",
        commercialOffer.get("message"), "Оповещение об одобрении коммерческого предложения");

    const commercialOfferSupplierName = commercialOffer.get("supplier").get("name");
    sendPushToAllExcept(commercialOfferOwner, "Появилось новое предложение от " + commercialOfferSupplierName,
        commercialOffer.get("message"), "Оповещение о новом коммерческом предложении");
});


Parse.Cloud.define("rejectCommercialOffer", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of commercial offer in database
    const commercialOffer = await getCommercialOfferById(request.params.commercialOfferId);
    commercialOffer.set("statusString", "rejected");
    commercialOffer.save(null, { useMasterKey: true });

    // send PN
    const commercialOfferOwnerRelation = commercialOffer.get("user", {useMasterKey: true});
    const commercialOfferOwner = await commercialOfferOwnerRelation.query().first({useMasterKey: true});
    sendPushTo(commercialOfferOwner, "Ваше коммерческое предложение не одобрено",
        commercialOffer.get("message"), "Оповещение об отказе в коммерческом предложении");
});

Parse.Cloud.define("applyAsAMemberToOrganization", async (request) => {
    let organizationId = request.params.organizationId;
    let memberId = request.params.memberId;

    const Organization = Parse.Object.extend("Organization");
    const query = new Parse.Query(Organization);
    query.get(organizationId, { useMasterKey: true })
        .then((organization) => {
            let members = organization.relation("members");
            const Member = Parse.Object.extend("Member");
            const query = new Parse.Query(Member);
            query.get(memberId, { useMasterKey: true })
                .then((member) => {
                    members.add(member);
                    organization.save(null, { useMasterKey: true });
                    member.set("organization", organization)
                    member.save(null, { useMasterKey: true });
                    var acl = member.getACL();
                    var organizationOwner = organization.get("owner");
                    acl.setReadAccess(organizationOwner.id, true);
                    acl.setWriteAccess(organizationOwner.id, true);
                    member.setACL(acl);

                    // send PNs to owner
                    var queryPush = new Parse.Query(Parse.Installation);
                    queryPush.equalTo('user', organizationOwner);
                    Parse.Push.send({
                        where: queryPush,
                        data: {
                            alert: "Поступила заявка на вступление участника " + member.get("firstName") + " " + member.get("lastName"),
                            name: "Заявка на вступление участника"
                        }
                    }, { useMasterKey: true })
                        .then(function() {
                            console.log("successful push");
                        }, function(error) {
                            console.log(error);
                        });
                })
                .catch(function(error) {
                    console.error(error);
                });
        }).catch(function(error) {
            console.error(error);
        });
});

//Supplier
Parse.Cloud.beforeSave("Supplier", (request) => {
    var supplier = request.object;
    var user = request.user;
    if(supplier.existed()) {
        // quit on update, proceed on create
        return;
    }
    //only 'onReview' state allowed on create
    supplier.set("statusString", "onReview");
    supplier.set("owner", user)

    //set ACLs
    var acl = new Parse.ACL();
    if(user) {
        acl.setReadAccess(user.id, true);
        acl.setWriteAccess(user.id, false);
    }
    acl.setRoleReadAccess("administrator", true);
    acl.setRoleWriteAccess("administrator", true);
    supplier.set('ACL', acl);
});

Parse.Cloud.afterSave("Supplier", (request) => {
    var supplier = request.object;
    var user = request.user;
    if(supplier.existed()) {
        // quit on update, proceed on create
        return;
    }

    //set Relations
    if(user) {
        var suppliers = user.relation("suppliers");
        suppliers.add(supplier);
        user.save(null, { useMasterKey: true });
    }

    //send PNs to administrators
    const pushName = "Заявка на вступление поставщика";
    const pushTitle = "Поступила заявка на вступление в клуб поставщика "; //+ supplier.get("name");
    const pushBody = supplier.get("name");
    const supplierId = supplier.id;
    sendPushToAdmins(pushName, pushTitle, pushBody, "supplier_created", supplierId);

});

//Organization
Parse.Cloud.beforeSave("Organization", (request) => {
    var organization = request.object;
    var user = request.user;
    if(organization.existed()) {
        // quit on update, proceed on create
        return;
    }
    //only 'onReview' state allowed on create
    organization.set("statusString", "onReview");
    organization.set("owner", user);

    //set ACLs
    var acl = new Parse.ACL();
    if(user) {
        acl.setReadAccess(user.id, true);
        acl.setWriteAccess(user.id, false);
    }
    acl.setRoleReadAccess("administrator", true);
    acl.setRoleWriteAccess("administrator", true);
    organization.set('ACL', acl);
});

Parse.Cloud.afterSave("Organization", (request) => {
    var organization = request.object;
    var user = request.user;
    if(organization.existed()) {
        // quit on update, proceed on create
        return;
    }

    //set Relations
    if(user) {
        var organizations = user.relation("organizations");
        organizations.add(organization);
        user.save(null, { useMasterKey: true });
    }

    //send PNs to administrators
    const pushName = "Заявка на вступление организации";
    const pushTitle = "Поступила заявка на вступление в клуб организации " + organization.get("name");
    //const pushBody =
    sendPushToAdmins(pushName, pushTitle);
});

//Member
Parse.Cloud.beforeSave("Member", (request) => {
    var member = request.object;
    var user = request.user;
    if(member.existed()) {
        // quit on update, proceed on create
        return;
    }
    //only 'onReview' state allowed on create
    member.set("statusString", "onReview");
    member.set("owner", user)

    //set ACLs
    var acl = new Parse.ACL();
    if(user) {
        acl.setReadAccess(user.id, true);
        acl.setWriteAccess(user.id, false);
    }
    acl.setRoleReadAccess("administrator", true);
    acl.setRoleWriteAccess("administrator", true);
    member.set('ACL', acl);
});

Parse.Cloud.afterSave("Member", (request) => {
    var member = request.object;
    var user = request.user;
    if(member.existed()) {
        // quit on update, proceed on create
        return;
    }

    //set Relations
    if(user) {
        var members = user.relation("members");
        members.add(member);
        user.save(null, { useMasterKey: true });
    }
});

Parse.Cloud.afterSave("Action", (request) => {
    var action = request.object;
    //var user = request.user;
    if(action.existed()) {
        // quit on update, proceed on create
        return;
    }

    //send PNs to administrators
    const pushName = "Заявка на проведение акции";
    const pushTitle = "Заявка на проведение акции ";
    const pushBody = action.get("message");
    const actionId = action.id;
    sendPushToAdmins(pushName, pushTitle, pushBody, "action_created", actionId);
});

Parse.Cloud.afterSave("CommercialOffer", (request) => {
    var commercialOffer = request.object;
    //var user = request.user;
    if(commercialOffer.existed()) {
        // quit on update, proceed on create
        return;
    }

    //send PNs to administrators
    const pushName = "Заявка на новое коммерческое предложение";
    const pushTitle = "Заявка на новое коммерческое предложение ";
    const pushBody = commercialOffer.get("message");
    sendPushToAdmins(pushName, pushTitle, pushBody);
});