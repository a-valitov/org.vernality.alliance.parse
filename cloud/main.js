Parse.Cloud.define('hello', function(req, res) {
    return 'Hi';
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
    organization.set("owner", user)

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

    // send PNs to admins
    var query = new Parse.Query(Parse.Role);
    query.equalTo("name", "administrator");
    query.first({ useMasterKey: true }).then((role) => {
        var relation = role.getUsers();
        relation.query().find({ useMasterKey: true }).then((users) => {
                var query = new Parse.Query(Parse.Installation);
                query.containedIn('user', users);
                Parse.Push.send({
                    where: query,
                    data: {
                        alert: "Поступила заявка на вступление в клуб организации",
                        name: "Заявка на вступление организации"
                    }
                }, { useMasterKey: true })
                .then(function() {
                    console.log("successful push");
                }, function(error) {
                    console.log(error);
                });
            }).catch(function(error) {
                console.log(error);
            });
    }).catch(function(error) {
        console.error(error);
    });
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
