import {computed, ref, toRef} from "vue";
import {useVuelidateOnForm} from "~/functions/useVuelidateOnForm";
import mergeExisting from "~/functions/mergeExisting";
import {useNotify} from "~/vendor/bootstrapVue";
import {useAxios} from "~/vendor/axios";

export const baseEditModalProps = {
    createUrl: {
        type: String,
        required: true
    }
};

export function useBaseEditModal(
    props,
    emit,
    $modal,
    validations,
    blankForm,
    userOptions = {}
) {
    const options = {
        clearContents: null,
        populateForm: null,
        getSubmittableFormData: null,
        buildSubmitRequest: null,
        onSubmitSuccess: null,
        onSubmitError: null,
        ...userOptions
    };

    const createUrl = toRef(props, 'createUrl');

    const loading = ref(true);
    const error = ref(null);
    const editUrl = ref(null);

    const isEditMode = computed(() => {
        return editUrl.value !== null;
    });

    const {form, v$, resetForm, ifValid} = useVuelidateOnForm(validations, blankForm);

    const clearContents = () => {
        if (typeof options.clearContents === 'function') {
            return options.clearContents();
        }

        resetForm();

        loading.value = false;
        error.value = null;
        editUrl.value = null;
    };

    const create = () => {
        clearContents();

        $modal.value.show();
    };

    const populateForm = (data) => {
        if (typeof options.populateForm === 'function') {
            return options.populateForm(data, form);
        }

        form.value = mergeExisting(form.value, data);
    }

    const {wrapWithLoading, notifySuccess} = useNotify();
    const {axios} = useAxios();

    const doLoad = () => {
        wrapWithLoading(
            axios.get(editUrl.value)
        ).then((resp) => {
            populateForm(resp.data);
            loading.value = false;
        }).catch(() => {
            close();
        });
    };

    const edit = (recordUrl) => {
        clearContents();

        editUrl.value = recordUrl;
        $modal.value.show();

        doLoad();
    };

    const getSubmittableFormData = () => {
        if (typeof options.getSubmittableFormData === 'function') {
            return options.getSubmittableFormData(form.value);
        }

        return form.value;
    };

    const buildSubmitRequest = () => {
        if (typeof options.buildSubmitRequest === 'function') {
            return options.buildSubmitRequest();
        }

        return {
            method: (isEditMode.value)
                ? 'PUT'
                : 'POST',
            url: (isEditMode.value)
                ? editUrl.value
                : createUrl.value,
            data: getSubmittableFormData()
        };
    };

    const close = () => {
        $modal.value.hide();
    };

    const onSubmitSuccess = () => {
        if (typeof options.onSubmitSuccess === 'function') {
            return options.onSubmitSuccess();
        }

        notifySuccess();
        emit('relist');
        close();
    };

    const onSubmitError = (error) => {
        if (typeof options.onSubmitError === 'function') {
            return options.onSubmitError(error);
        }

        error.value = error.response.data.message;
    };

    const doSubmit = () => {
        ifValid(() => {
            error.value = null;

            wrapWithLoading(
                axios(buildSubmitRequest())
            ).then((resp) => {
                onSubmitSuccess(resp);
            }).catch((error) => {
                onSubmitError(error);
            });
        });
    };

    return {
        loading,
        error,
        editUrl,
        isEditMode,
        form,
        v$,
        clearContents,
        create,
        edit,
        doSubmit,
        close
    };
}
