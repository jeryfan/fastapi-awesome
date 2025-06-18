


class CRUDBase:

    def __init__(self, model):
        self.model = model

    
    def query(self, *args, **kwargs):

        return self.model.query.filter(*args, **kwargs)

        