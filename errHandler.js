const errDialog = document.getElementById("errDialog"),
    errTitle = document.getElementById("errTitle"),
    errDesc = document.getElementById("errDesc"),
    cancelButton = document.getElementById("cancel"),
    confirmButton = document.getElementById("confirm");
    
let locked = false;
let isConfirm
let waitPressResolve;

function waitForPress() {
    return new Promise(resolve => waitPressResolve = resolve)
}
function buttonResolver() {
    if (waitPressResolve) {
        waitPressResolve();
        isConfirm = (this.id == "confirm");
    }
}
    
function changeLockState() {
    if (!locked) {
        document.body.style.height = "100%";
        document.body.style.overflow = "hidden";
        locked = true;
    } else {
        document.body.style.height = "unset";
        document.body.style.overflow = "visible";
        locked = false;
    }
}
    
async function windowAlert(desc) {
    changeLockState();
    
    errTitle.textContent = "Woah there!";
    errDesc.textContent = desc;
    
    errDialog.showModal();
    
    confirmButton.addEventListener("click", buttonResolver, {once: true});
    await waitForPress();
    errDialog.close();
    
    changeLockState();
}

async function windowConfirm(desc) {
    changeLockState();
    
    cancelButton.style.display = "inline";
    errTitle.textContent = "You sure?";
    errDesc.textContent = desc;
    
    errDialog.showModal();
    
    confirmButton.addEventListener("click", buttonResolver);
    cancelButton.addEventListener("click", buttonResolver);
    
    await waitForPress();
    
    confirmButton.removeEventListener("click", buttonResolver);
    cancelButton.removeEventListener("click", buttonResolver);
    
    errDialog.close();
    
    changeLockState();
    
    return new Promise(resolve => resolve(isConfirm));
}
