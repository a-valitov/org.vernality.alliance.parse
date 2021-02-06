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

async function getOrganizationById(organizationId) {
    const Organization = Parse.Object.extend("Organization");
    const organizationQuery = new Parse.Query(Organization);
    const organization = await organizationQuery.get(organizationId, {useMasterKey: true});
    return organization;
}

async function getSupplierById(supplierId) {
    const Supplier = Parse.Object.extend("Supplier");
    const supplierQuery = new Parse.Query(Supplier);
    const supplier = await supplierQuery.get(supplierId, {useMasterKey: true});
    return supplier;
}

async function getMemberById(memberId) {
    const Member = Parse.Object.extend("Member");
    const memberQuery = new Parse.Query(Member);
    //actionQuery.include("supplier");
    //actionQuery.include("user");
    return await memberQuery.get(memberId, {useMasterKey: true});
}

async function addUserToRole(user, roleName) {
    var query = new Parse.Query(Parse.Role);
    query.equalTo("name", roleName);
    const role = await query.first({useMasterKey: true});
    role.getUsers().add(user, {useMasterKey: true});
    role.save(null, {useMasterKey: true});
}

Parse.Cloud.define("approveAction", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of commercial offer in database
    const action = await getActionById(request.params.actionId);
    action.set("statusString", "approved");

    // allow to read action for members and organizations
    var acl = action.getACL();
    acl.setRoleReadAccess("organization", true);
    acl.setRoleReadAccess("member", true);
    action.setACL(acl);

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

    // allow to read action for members and organizations
    var acl = commercialOffer.getACL();
    acl.setRoleReadAccess("organization", true);
    commercialOffer.setACL(acl);

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


Parse.Cloud.define("approveOrganization", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of Organization in database
    const organization = await getOrganizationById(request.params.organizationId);
    organization.set("statusString", "approved");
    var acl = organization.getACL();
    acl.setRoleReadAccess("registered", true);
    organization.setACL(acl);
    organization.save(null, { useMasterKey: true });

    // sending PN
    const organizationOwner = organization.get("owner", {useMasterKey: true});
    sendPushTo(organizationOwner, "Вашу организацию одобрили!",
        organization.get("name") + " теперь участник клуба.", "Оповещение об одобрении организации");

    // give organization owner user organization role privileges
    addUserToRole(organizationOwner, "organization");
});

Parse.Cloud.define("rejectOrganization", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of Organization in database
    const organization = await getOrganizationById(request.params.organizationId);
    organization.set("statusString", "rejected");
    organization.save(null, { useMasterKey: true });

    // sending PN
    const organizationOwner = organization.get("owner", {useMasterKey: true});
    sendPushTo(organizationOwner, "Вашей организации отказано в регистрации",
        organization.get("name") + " не может стать участником клуба.", "Оповещение об отказе для организации");
});

Parse.Cloud.define("approveSupplier", async (request) => {
    // check if the user has enough rights
    let userIsAdmin = await isAdmin(request.user);
    if (!userIsAdmin) return;

    // rewrite status of Organization in database
    const supplier = await getSupplierById(request.params.supplierId);
    supplier.set("statusString", "approved");
    supplier.save(null, { useMasterKey: true });

    // sending PN
    const supplierOwner = supplier.get("owner", {useMasterKey: true});
    sendPushTo(supplierOwner, "Вашего поставщика одобрили!",
        supplier.get("name") + " теперь участник клуба.", "Оповещение об одобрении поставщика");

    // give supplier owner user supplier role privileges
    addUserToRole(supplierOwner, "supplier");
});

Parse.Cloud.define("rejectSupplier", async (request) => {
    // check if the user has enough rights
    let userIsAdmin = await isAdmin(request.user);
    if (!userIsAdmin) return;

    // rewrite status of Organization in database
    const supplier = await getSupplierById(request.params.supplierId);
    supplier.set("statusString", "rejected");
    supplier.save(null, { useMasterKey: true });

    // sending PN
    const supplierOwner = supplier.get("owner", {useMasterKey: true});
    sendPushTo(supplierOwner, "Вашего поставщика не одобрили",
        supplier.get("name") + " не может стать участником клуба.", "Оповещение об одобрении поставщика");
});

Parse.Cloud.define("rejectOrganization", async (request) => {
    // check if the user has enough rights
    let user = request.user;
    let userIsAdmin = await isAdmin(user);
    if (!userIsAdmin) return;

    // rewrite status of Organization in database
    const organization = await getOrganizationById(request.params.organizationId);
    organization.set("statusString", "rejected");
    organization.save(null, { useMasterKey: true });

    // sending PN
    const organizationOwner = organization.get("owner", {useMasterKey: true});
    sendPushTo(organizationOwner, "Вашей организации отказано в регистрации",
        organization.get("name"), "Оповещение об отказе для организации");
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

                    // send PN to owner
                    sendPushTo(organizationOwner, "Новый участник",
                        member.get("firstName") + " " + member.get("lastName") + " хочет вступить в вашу организацию",
                        "Заявка на вступление участника");

                })
                .catch(function(error) {
                    console.error(error);
                });
        }).catch(function(error) {
            console.error(error);
        });
});

Parse.Cloud.define("approveMember", async (request) => {
    // TODO: check if the user has enough rights

    // rewrite status of member in database
    const member = await getMemberById(request.params.memberId);
    member.set("statusString", "approved");
    member.save(null, { useMasterKey: true });

    // sending PN
    const memberUser = member.get("owner", {useMasterKey: true});
    const organizationId = member.get("organization", {useMasterKey: true}).id;
    const organization = await getOrganizationById(organizationId) //organizationRelation.query().first({useMasterKey: true});

    sendPushTo(memberUser, "Ваше участие одобрили!",
        "Компания " + organization.get("name") + " подтвердила, что вы её сотрудник.", "Оповещение об одобрении участника");

    // give owner user member role privileges
    addUserToRole(memberUser, "member");
});

Parse.Cloud.define("rejectMember", async (request) => {
    // TODO: check if the user has enough rights

    // rewrite status of member in database
    const member = await getMemberById(request.params.memberId);
    member.set("statusString", "rejected");
    member.save(null, { useMasterKey: true });

    // sending PN
    const memberUser = member.get("owner", {useMasterKey: true});
    const organizationId = member.get("organization", {useMasterKey: true}).id;
    const organization = await getOrganizationById(organizationId) //organizationRelation.query().first({useMasterKey: true});

    sendPushTo(memberUser, "Вам отказано в участии",
        "Компания " + organization.get("name") + " не подтвердила, что вы её сотрудник.", "Оповещение об отказе участнику");
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

Parse.Cloud.afterSave(Parse.User, (request) => {
    var user = request.object;
    addUserToRole(user, "registered");
});