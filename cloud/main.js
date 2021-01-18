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


Parse.Cloud.define("approveAction", async (request) => {
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    let actionId = request.params.actionId;

    //rewrite status of action in database
    const Action = Parse.Object.extend("Action");
    const actionQuery = new Parse.Query(Action);
    actionQuery.include("supplier")

    actionQuery.get(actionId, { useMasterKey: true })
        .then((action) => {
            action.set("statusString", "approved");
            action.save(null, { useMasterKey: true });

            const actionSupplierName = action.get("supplier").get("name");

            // send PNs to all users except the current one
            var queryUsers = new Parse.Query(Parse.User);
            queryUsers.notEqualTo("objectId", user.id);
            Parse.Push.send({
                where: queryUsers,
                data: {
                    alert: {
                        "title" : "Появилась новая акция от " + actionSupplierName,
                        "body" : action.get("message") + " " + action.get("descriptionOf"),
                    },
                    sound: "space.caf",
                    name: "Оповещение о новой акции",
                }
            }, { useMasterKey: true })
                .then(function() {
                    console.log("successful push");
                }, function(error) {
                    console.log(error);
                });

        }, (error) => {
            console.error(error);
        });

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