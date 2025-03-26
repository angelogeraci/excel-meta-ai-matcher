import axios from 'axios';
import { ExcelFile, MatchResult, ExportOptions } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

export const apiService = {
  async fetchFileDetails(fileId: string): Promise<ExcelFile> {
    try {
      const response = await axios.get(`${API_BASE_URL}/files/${fileId}`);
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des détails du fichier', error);
      throw error;
    }
  },

  async fetchResults(fileId: string, columnName: string): Promise<MatchResult[]> {
    try {
      const response = await axios.get(`${API_BASE_URL}/results/${fileId}`, {
        params: { column: columnName }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la récupération des résultats', error);
      throw error;
    }
  },

  async exportResults(fileId: string, options: ExportOptions): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/export/${fileId}`, options, {
        responseType: 'blob'
      });
      
      // Créer un lien de téléchargement
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `export_${fileId}.${options.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      return 'Export réussi';
    } catch (error) {
      console.error('Erreur lors de l\'export des résultats', error);
      throw error;
    }
  },

  async updateSuggestion(resultId: string, suggestionId: string) {
    try {
      const response = await axios.patch(`${API_BASE_URL}/results/${resultId}/suggestion`, {
        suggestionId
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la suggestion', error);
      throw error;
    }
  },

  async deleteResults(resultIds: string[]) {
    try {
      const response = await axios.delete(`${API_BASE_URL}/results`, {
        data: { resultIds }
      });
      return response.data;
    } catch (error) {
      console.error('Erreur lors de la suppression des résultats', error);
      throw error;
    }
  }
};