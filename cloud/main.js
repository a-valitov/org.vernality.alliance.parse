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
